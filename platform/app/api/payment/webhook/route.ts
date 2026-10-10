import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/api-auth";
import { SlickPayService } from "@/lib/slickpay";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("SlickPay Webhook received:", body);

    const rawData = body?.data || body;
    const invoiceId = String(rawData?.id || rawData?.invoice_id || "");

    if (!invoiceId) {
      return NextResponse.json({ status: "ignored", reason: "No invoice_id" });
    }

    // Vérification auprès de SlickPay pour éviter toute tentative d'usurpation
    const slickpay = new SlickPayService();
    const statusRes = await slickpay.getInvoice(invoiceId);

    if (!statusRes.isPaid) {
      return NextResponse.json({ status: "pending", message: "Payment not confirmed" });
    }

    const admin = getAdminClient();
    const { data: rows } = await admin
      .from("plan_transactions")
      .select("*")
      .eq("invoice_id", invoiceId);

    if (!rows || rows.length === 0) {
      return NextResponse.json({ status: "not_found" });
    }

    const tx = rows[0];
    if (tx.status === "paid") {
      return NextResponse.json({ status: "already_processed" });
    }

    const daysToAdd = tx.billing_period === "yearly" ? 365 : 30;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + daysToAdd);
    const expiresAtIso = expiresAt.toISOString();

    // Mise à jour profil
    await admin
      .from("profiles")
      .update({
        plan: tx.plan,
        plan_expires_at: expiresAtIso,
      })
      .eq("id", tx.user_id);

    // Mise à jour transaction
    await admin
      .from("plan_transactions")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        expires_at: expiresAtIso,
        slickpay_raw: statusRes.raw,
      })
      .eq("id", tx.id);

    return NextResponse.json({ status: "success", plan: tx.plan });
  } catch (err: any) {
    console.error("SlickPay Webhook exception:", err);
    return NextResponse.json(
      { status: "error", message: err.message },
      { status: 500 }
    );
  }
}
