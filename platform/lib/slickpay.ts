/**
 * SlickPay TypeScript Client pour Next.js (App Router)
 * Passerelle de paiement algérienne BaridiMob & CIB (SATIM)
 */

export interface PlanPricing {
  name: string;
  monthly: number;
  yearly: number;
  stores_limit: number;
  products_limit: number;
}

export const PLANS_PRICING: Record<string, PlanPricing> = {
  free: {
    name: "Gratuit",
    monthly: 0,
    yearly: 0,
    stores_limit: 1,
    products_limit: 10,
  },
  pro: {
    name: "Pro",
    monthly: 2000,
    yearly: 20000,
    stores_limit: 5,
    products_limit: -1,
  },
  business: {
    name: "Business",
    monthly: 5000,
    yearly: 50000,
    stores_limit: -1,
    products_limit: -1,
  },
};

export function getPlanAmount(plan: string, billingPeriod: "monthly" | "yearly" = "monthly"): number {
  const p = PLANS_PRICING[plan.toLowerCase()] ?? PLANS_PRICING.free!;
  return billingPeriod === "yearly" ? p.yearly : p.monthly;
}

export class SlickPayService {
  private apiKey: string;
  private env: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = (process.env.SLICKPAY_API_KEY || "").trim();
    this.env = (process.env.SLICKPAY_ENV || "production").trim().toLowerCase();
    this.baseUrl =
      this.env === "dev" || this.env === "development"
        ? "https://devapi.slick-pay.com/api/v2"
        : "https://prodapi.slick-pay.com/api/v2";
  }

  get isSimulation(): boolean {
    return !this.apiKey || this.apiKey.toLowerCase().startsWith("mock");
  }

  async createInvoice(params: {
    amount: number;
    returnUrl: string;
    plan: string;
    billingPeriod: "monthly" | "yearly";
    firstname?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    address?: string;
  }): Promise<{ invoiceId: string; paymentUrl: string; isSimulation: boolean; raw: any }> {
    const { amount, returnUrl, plan, billingPeriod, firstname, lastname, email, phone, address } = params;

    if (amount < 100) {
      throw new Error(`Le montant minimum SlickPay est de 100 DZD. Reçu: ${amount} DZD`);
    }

    // Mode simulation si aucune clé configurée
    if (this.isSimulation) {
      const simId = `sim_${Date.now()}`;
      const sep = returnUrl.includes("?") ? "&" : "?";
      const simRedirect = `${returnUrl}${sep}invoice_id=${simId}&simulated=true`;
      return {
        invoiceId: simId,
        paymentUrl: simRedirect,
        isSimulation: true,
        raw: { simulated: true, amount },
      };
    }

    const planInfo = PLANS_PRICING[plan.toLowerCase()] ?? PLANS_PRICING.pro!;
    const periodLabel = billingPeriod === "yearly" ? "Annuel" : "Mensuel";

    const payload = {
      amount: Math.round(amount),
      url: returnUrl,
      firstname: firstname || "Marchand",
      lastname: lastname || "EasyTrade",
      email: email || "marchand@easytradez.site",
      phone: phone || "0555000000",
      address: address || "Algérie",
      items: [
        {
          name: `Abonnement EasyTrade ${planInfo.name} (${periodLabel})`,
          price: Math.round(amount),
          quantity: 1,
        },
      ],
      comment: `Abonnement EasyTrade ${plan.toUpperCase()} - ${email}`,
    };

    const response = await fetch(`${this.baseUrl}/users/invoices`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SlickPay createInvoice error:", response.status, errorText);
      throw new Error(`Erreur passerelle SlickPay (HTTP ${response.status}) : ${errorText}`);
    }

    const data = await response.json();
    const rawData = data.data || data;

    const paymentUrl =
      data.url ||
      rawData.url ||
      rawData.payment_url ||
      (rawData.invoice && typeof rawData.invoice === "object" ? rawData.invoice.url : "") ||
      "";

    const invoiceId = String(
      data.id ||
      rawData.id ||
      rawData.invoice_id ||
      (rawData.invoice && typeof rawData.invoice === "object" ? rawData.invoice.id : "") ||
      ""
    );

    if (!paymentUrl) {
      throw new Error("SlickPay n'a pas retourné d'URL de paiement valide.");
    }

    return {
      invoiceId,
      paymentUrl,
      isSimulation: false,
      raw: data,
    };
  }

  async getInvoice(invoiceId: string): Promise<{
    invoiceId: string;
    isPaid: boolean;
    statusRaw: string;
    raw: any;
  }> {
    if (this.isSimulation || String(invoiceId).startsWith("sim_")) {
      return {
        invoiceId: String(invoiceId),
        isPaid: true,
        statusRaw: "completed",
        raw: { simulated: true },
      };
    }

    const response = await fetch(`${this.baseUrl}/users/invoices/${invoiceId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erreur récupération facture SlickPay (HTTP ${response.status}) : ${errText}`);
    }

    const data = await response.json();
    const rawData = data.data || data;

    const completedFlag = data.completed ?? rawData.completed;
    const payStatus = rawData.pay_status;
    const statusRaw = String(
      rawData.status || rawData.payment_status || rawData.state || "unknown"
    ).toLowerCase();

    const paidKeywords = [
      "completed",
      "paid",
      "success",
      "settled",
      "payé",
      "paye",
      "complété",
      "complete",
      "terminé",
      "termine",
      "traité",
      "traite",
    ];

    const isPaid =
      completedFlag === 1 ||
      payStatus === 1 ||
      paidKeywords.some((kw) => statusRaw.includes(kw));

    return {
      invoiceId: String(invoiceId),
      isPaid,
      statusRaw,
      raw: data,
    };
  }
}
