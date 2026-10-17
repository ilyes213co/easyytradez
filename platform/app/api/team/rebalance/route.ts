import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";
import { rebalanceOrders } from "@/lib/dispatcher";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const admin = getAdminClient();
    const result = await rebalanceOrders(user.id, admin);

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/team/rebalance error:", err);
    return NextResponse.json({ detail: err?.message || "Erreur interne" }, { status: 500 });
  }
}
