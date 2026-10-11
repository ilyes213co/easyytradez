import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";
import { SlickPayService, getPlanAmount } from "@/lib/slickpay";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { detail: "Veuillez vous connecter pour souscrire à un abonnement." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const plan = (body.plan || "pro").toLowerCase();
    const billingPeriod = body.billing_period === "yearly" ? "yearly" : "monthly";

    if (plan !== "pro" && plan !== "business") {
      return NextResponse.json(
        { detail: "Plan invalide. Choisissez 'pro' ou 'business'." },
        { status: 400 }
      );
    }

    const amount = getPlanAmount(plan, billingPeriod);
    if (amount <= 0) {
      return NextResponse.json(
        { detail: "Ce plan est gratuit ou le montant est invalide." },
        { status: 400 }
      );
    }

    const admin = getAdminClient();

    // Reuse existing pending payment session if created recently
    try {
      const { data: existingTxs } = await admin
        .from("plan_transactions")
        .select("id, invoice_id, payment_url, amount, currency, created_at")
        .eq("user_id", user.id)
        .eq("plan", plan)
        .eq("billing_period", billingPeriod)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingTxs && existingTxs.length > 0 && existingTxs[0]) {
        const activeTx = existingTxs[0];
        const ageMinutes = (Date.now() - new Date(activeTx.created_at).getTime()) / (1000 * 60);
        if (ageMinutes < 15 && activeTx.payment_url && activeTx.invoice_id) {
          return NextResponse.json({
            success: true,
            invoice_id: String(activeTx.invoice_id),
            payment_url: activeTx.payment_url,
            transaction_id: activeTx.id,
            amount: activeTx.amount,
            currency: activeTx.currency || "DZD",
            is_simulation: false,
            message: "Reprise de votre session de paiement BaridiMob / SATIM...",
          });
        }
      }
    } catch (checkErr) {
      console.warn("Could not check existing pending transactions:", checkErr);
    }

    let profileName = "Marchand EasyTrade";
    let profilePhone = "0555000000";

    try {
      const { data: profile } = await admin
        .from("profiles")
        .select("full_name, phone")
        .eq("id", user.id)
        .single();

      if (profile?.full_name) profileName = profile.full_name.trim();
      if (profile?.phone) profilePhone = profile.phone.trim();
    } catch (e) {
      console.warn("Could not fetch profile info for invoice:", e);
    }

    let cleanPhone = profilePhone;
    if (cleanPhone.startsWith("+213")) {
      cleanPhone = "0" + cleanPhone.slice(4);
    } else if (cleanPhone.startsWith("213")) {
      cleanPhone = "0" + cleanPhone.slice(3);
    }
    cleanPhone = cleanPhone.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      cleanPhone = "0555000000";
    }

    const nameParts = profileName.split(" ");
    const firstname = nameParts[0] || "Marchand";
    const lastname = nameParts.slice(1).join(" ") || "EasyTrade";
    const email = user.email || `merchant_${user.id.slice(0, 8)}@easytradez.site`;

    const defaultAppUrl = process.env.NEXT_PUBLIC_APP_URL || "https://easytradez.site";
    const origin = req.nextUrl.origin || defaultAppUrl;
    let returnUrl = body.return_url || `${origin}/dashboard/upgrade/callback`;
    if (returnUrl.includes("localhost") && !defaultAppUrl.includes("localhost")) {
      returnUrl = `${defaultAppUrl.replace(/\/$/, "")}/dashboard/upgrade/callback`;
    }

    const slickpay = new SlickPayService();
    let result;
    try {
      result = await slickpay.createInvoice({
        amount,
        returnUrl,
        plan,
        billingPeriod,
        firstname,
        lastname,
        email,
        phone: cleanPhone,
        address: "Algérie",
      });
    } catch (err: any) {
      const errorMsg = String(err?.message || "").toLowerCase();
      // Recover existing pending session if SATIM rejects with a duplicate order error
      if (errorMsg.includes("already registered") || errorMsg.includes("processed already")) {
        const { data: latestPending } = await admin
          .from("plan_transactions")
          .select("id, invoice_id, payment_url, amount, currency")
          .eq("user_id", user.id)
          .eq("plan", plan)
          .order("created_at", { ascending: false })
          .limit(1);

        if (latestPending && latestPending.length > 0 && latestPending[0]?.payment_url) {
          const pendingItem = latestPending[0];
          return NextResponse.json({
            success: true,
            invoice_id: String(pendingItem.invoice_id),
            payment_url: pendingItem.payment_url,
            transaction_id: pendingItem.id,
            amount,
            currency: "DZD",
            is_simulation: false,
            message: "Redirection vers la session de paiement active...",
          });
        }
      }
      throw err;
    }

    let transactionId = null;
    try {
      const { data: tx, error: txErr } = await admin
        .from("plan_transactions")
        .insert({
          user_id: user.id,
          plan,
          amount,
          currency: "DZD",
          billing_period: billingPeriod,
          invoice_id: result.invoiceId,
          payment_url: result.paymentUrl,
          status: "pending",
          slickpay_raw: result.raw,
        })
        .select("id")
        .single();

      if (!txErr && tx) {
        transactionId = tx.id;
      }
    } catch (dbErr) {
      console.warn("Failed to insert into plan_transactions:", dbErr);
    }

    return NextResponse.json({
      success: true,
      invoice_id: result.invoiceId,
      payment_url: result.paymentUrl,
      transaction_id: transactionId,
      amount,
      currency: "DZD",
      is_simulation: result.isSimulation,
      message: "Redirection vers la passerelle BaridiMob / SATIM...",
    });
  } catch (err: any) {
    console.error("POST /api/payment/create-subscription-invoice error:", err);
    return NextResponse.json(
      { detail: err.message || "Erreur lors de l'initialisation du paiement." },
      { status: 500 }
    );
  }
}
