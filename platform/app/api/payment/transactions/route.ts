import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { detail: "Non authentifié" },
        { status: 401 }
      );
    }

    const admin = getAdminClient();
    const { data: transactions, error } = await admin
      .from("plan_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      console.warn("Fetch transactions error:", error.message);
      return NextResponse.json({ transactions: [] });
    }

    return NextResponse.json({
      transactions: transactions || [],
    });
  } catch (err: any) {
    console.error("GET /api/payment/transactions error:", err);
    return NextResponse.json(
      { detail: err.message || "Erreur récupération historique" },
      { status: 500 }
    );
  }
}
