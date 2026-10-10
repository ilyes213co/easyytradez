import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";
import { SlickPayService } from "@/lib/slickpay";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { detail: "Non authentifié" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    let invoiceId = searchParams.get("invoice_id") || searchParams.get("id");
    const transactionId = searchParams.get("transaction_id");

    const admin = getAdminClient();

    // 1. Recherche de la transaction en base
    let transaction: any = null;
    try {
      let query = admin.from("plan_transactions").select("*");
      if (transactionId) {
        query = query.eq("id", transactionId);
      } else if (invoiceId) {
        query = query.eq("invoice_id", invoiceId);
      } else {
        // Fallback sur la dernière transaction en attente de l'utilisateur
        query = query
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1);
      }

      const { data: rows } = await query;
      if (rows && rows.length > 0) {
        transaction = rows[0];
        if (!invoiceId && transaction.invoice_id) {
          invoiceId = String(transaction.invoice_id);
        }
      }
    } catch (e) {
      console.warn("Recherche transaction échouée:", e);
    }

    if (!invoiceId) {
      return NextResponse.json(
        { detail: "Identifiant de facture manquant pour la vérification." },
        { status: 400 }
      );
    }

    const targetPlan = transaction?.plan || "pro";
    const billingPeriod = transaction?.billing_period || "monthly";

    // Si déjà validé en base (idempotence)
    if (transaction && transaction.status === "paid") {
      return NextResponse.json({
        success: true,
        is_paid: true,
        plan: targetPlan,
        status: "paid",
        expires_at: transaction.expires_at,
        message: "Abonnement déjà actif et validé.",
      });
    }

    // 2. Vérification auprès de SlickPay
    const slickpay = new SlickPayService();
    const statusRes = await slickpay.getInvoice(invoiceId);

    if (!statusRes.isPaid) {
      return NextResponse.json({
        success: false,
        is_paid: false,
        plan: targetPlan,
        status: statusRes.statusRaw,
        message: "Le paiement n'a pas encore été confirmé par BaridiMob / SATIM.",
      });
    }

    // 3. Paiement validé avec succès ! Calcul date expiration
    const daysToAdd = billingPeriod === "yearly" ? 365 : 30;
    const expiresAtDate = new Date();
    expiresAtDate.setDate(expiresAtDate.getDate() + daysToAdd);
    const expiresAtIso = expiresAtDate.toISOString();

    // Mise à jour du profil du marchand
    try {
      await admin
        .from("profiles")
        .update({
          plan: targetPlan,
          plan_expires_at: expiresAtIso,
        })
        .eq("id", user.id);
    } catch (err) {
      console.error("Erreur mise à jour profil marchand:", err);
    }

    // Mise à jour de la table plan_transactions
    if (transaction) {
      try {
        await admin
          .from("plan_transactions")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            expires_at: expiresAtIso,
            slickpay_raw: statusRes.raw,
          })
          .eq("id", transaction.id);
      } catch (err) {
        console.warn("Erreur mise à jour transaction:", err);
      }
    }

    return NextResponse.json({
      success: true,
      is_paid: true,
      plan: targetPlan,
      status: "paid",
      expires_at: expiresAtIso,
      message: `Félicitations ! Votre abonnement ${targetPlan.toUpperCase()} est désormais actif sur votre compte.`,
    });
  } catch (err: any) {
    console.error("GET /api/payment/verify error:", err);
    return NextResponse.json(
      { detail: err.message || "Erreur lors de la vérification du paiement" },
      { status: 500 }
    );
  }
}
