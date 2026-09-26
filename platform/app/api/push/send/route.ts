import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

// ─── Configure VAPID ──────────────────────────────────────────────────────────
// Generate keys once with: npx web-push generate-vapid-keys
// Then add to .env.local:
//   VAPID_PUBLIC_KEY=...
//   VAPID_PRIVATE_KEY=...
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY=...  (same as VAPID_PUBLIC_KEY)
//   VAPID_MAILTO=mailto:vous@exemple.com

webpush.setVapidDetails(
  process.env.VAPID_MAILTO     ?? "mailto:admin@marchand.app",
  process.env.VAPID_PUBLIC_KEY  ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface WebhookPayload {
  type:   "INSERT" | "UPDATE" | "DELETE";
  table:  string;
  record: Record<string, unknown>;
  old_record?: Record<string, unknown>;
}

interface PushSubscriptionRow {
  endpoint: string;
  p256dh:   string;
  auth:     string;
}

// ─── Supabase admin client (service role) ─────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const serviceKey =
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "";
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } }
  );
}

// ─── Build notification payload ───────────────────────────────────────────────

function buildPayload(table: string, record: Record<string, unknown>, type: string) {
  // New order
  if (table === "orders" && type === "INSERT") {
    return {
      title: "🛒 Nouvelle commande !",
      body:  `${record.customer_name} vient de commander — ${Number(record.total ?? record.total_amount ?? 0).toLocaleString("fr-DZ")} DZD`,
      type:  "new_order",
      url:   "/dashboard/orders",
    };
  }

  // Stock at zero
  if (table === "products" && type === "UPDATE") {
    const oldStock = Number((record as Record<string, unknown>)?.stock ?? 1);
    const newStock = Number(record.stock);
    if (newStock === 0 && oldStock > 0) {
      return {
        title: "⚠️ Stock épuisé",
        body:  `"${record.name}" est en rupture de stock.`,
        type:  "stock_zero",
        url:   "/dashboard/products",
      };
    }
  }

  return null;
}

// ─── POST handler (called by Supabase Database Webhook) ──────────────────────

export async function POST(req: NextRequest) {
  // Optional: verify secret header to ensure only Supabase calls this
  const secret = req.headers.get("x-webhook-secret");
  if (process.env.WEBHOOK_SECRET && secret !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: WebhookPayload;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, table, record } = body;

  // Build notification content
  const payload = buildPayload(table, record, type);
  if (!payload) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const storeId = record.store_id as string;
  if (!storeId) return NextResponse.json({ ok: true, skipped: true });

  // Fetch all subscriptions for this store
  const supabase = getAdminClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("store_id", storeId);

  if (!subs || subs.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const payloadStr = JSON.stringify(payload);
  let sent = 0;
  const expired: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub: PushSubscriptionRow) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr
        );
        sent++;
      } catch (err: unknown) {
        // 410 Gone = subscription expired, clean it up
        if (typeof err === "object" && err !== null && "statusCode" in err) {
          const statusCode = (err as { statusCode: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            expired.push(sub.endpoint);
          }
        }
      }
    })
  );

  // Remove expired subscriptions
  if (expired.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", expired);
  }

  return NextResponse.json({ ok: true, sent, expired: expired.length });
}
