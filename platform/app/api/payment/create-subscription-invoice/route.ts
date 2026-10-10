import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";
import { SlickPayService, getPlanAmount } from "@/lib/slickpay";

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

    // Récupération des informations de profil
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

    const nameParts = profileName.split(" ");
    const firstname = nameParts[0] || "Marchand";
    const lastname = nameParts.slice(1).join(" ") || "EasyTrade";
    const email = user.email || `merchant_${user.id.slice(0, 8)}@easytradez.site`;

    // Détermination de l'URL de retour
    const origin = req.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || "https://easytradez.site";
    const returnUrl = body.return_url || `${origin}/dashboard/upgrade/callback`;

    // Création de la facture auprès de SlickPay
    const slickpay = new SlickPayService();
    const result = await slickpay.createInvoice({
      amount,
      returnUrl,
      plan,
      billingPeriod,
      firstname,
      lastname,
      email,
      phone: profilePhone,
      address: "Algérie",
    });

    // Enregistrement de la transaction dans la table plan_transactions
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
