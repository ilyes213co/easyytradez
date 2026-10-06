import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";

export async function GET(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const { storeId } = params;
    const admin = getAdminClient();
    const check = await verifyStoreOwner(storeId, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") || "7d") as "today" | "7d" | "30d" | "3m";

    const days = period === "today" ? 1 : period === "30d" ? 30 : period === "3m" ? 90 : 7;
    const now = new Date();
    const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // Fetch events and orders in parallel
    const [eventsRes, ordersRes, productsRes] = await Promise.all([
      admin
        .from("store_analytics")
        .select("event_type, product_id, metadata, created_at")
        .eq("store_id", storeId)
        .gte("created_at", start.toISOString()),
      admin
        .from("orders")
        .select("id, created_at, customer_name, items, total_amount, status")
        .eq("store_id", storeId)
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false })
        .limit(50),
      admin
        .from("products")
        .select("id, name, images")
        .eq("store_id", storeId),
    ]);

    const events = eventsRes.data || [];
    const orders = ordersRes.data || [];
    const productsMap = new Map((productsRes.data || []).map((p: any) => [p.id, p]));

    const views = events.filter((e) => e.event_type === "view").length;
    const waClicks = events.filter((e) => e.event_type === "whatsapp_click").length;
    const confirmedOrders = orders.filter((o) => o.status === "confirmed").length;
    const conversionRate = views > 0 ? Math.round((waClicks / views) * 1000) / 10 : 0;

    // Daily views
    const dailyMap: Record<string, number> = {};
    for (const e of events) {
      if (e.event_type === "view" && e.created_at) {
        const d = e.created_at.slice(0, 10);
        dailyMap[d] = (dailyMap[d] || 0) + 1;
      }
    }

    const dailyViews = [];
    for (let i = 0; i < days; i++) {
      const dt = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dayKey = dt.toISOString().slice(0, 10);
      const label = `${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`;
      dailyViews.push({ date: label, views: dailyMap[dayKey] || 0 });
    }

    // Top products
    const productViewCounts: Record<string, number> = {};
    for (const e of events) {
      if (e.event_type === "product_view" && e.product_id) {
        productViewCounts[e.product_id] = (productViewCounts[e.product_id] || 0) + 1;
      }
    }

    const topProducts = Object.entries(productViewCounts)
      .map(([pid, cnt]) => {
        const p = productsMap.get(pid);
        return {
          product_id: pid,
          name: p?.name || "Produit",
          views: cnt,
          image: Array.isArray(p?.images) ? (p.images[0]?.url || p.images[0]) : null,
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 8);

    // Traffic sources
    const sourceMap: Record<string, number> = { Direct: 0, WhatsApp: 0, Facebook: 0, Autre: 0 };
    for (const e of events) {
      if (e.event_type === "view") {
        const src = (e.metadata as any)?.source || "Direct";
        sourceMap[src] = (sourceMap[src] || 0) + 1;
      }
    }

    const trafficSources = Object.entries(sourceMap).map(([source, count]) => ({ source, count }));

    return NextResponse.json({
      store_id: storeId,
      period,
      kpi: {
        views,
        views_prev: 0,
        whatsapp_clicks: waClicks,
        whatsapp_clicks_prev: 0,
        conversion_rate: conversionRate,
        conversion_rate_prev: 0,
        confirmed_orders: confirmedOrders,
        confirmed_orders_prev: 0,
      },
      daily_views: dailyViews,
      top_products: topProducts,
      traffic_sources: trafficSources,
      recent_orders: orders.slice(0, 20),
    });
  } catch (err: any) {
    console.error("GET /api/analytics/[storeId] error:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
