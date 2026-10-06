import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";
import { RAW_WILAYAS } from "@/lib/wilayas";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const { id } = params;
    const admin = getAdminClient();
    const check = await verifyStoreOwner(id, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    // Attempt to fetch custom shipping rates from DB
    const { data: dbRates } = await admin
      .from("shipping_rates")
      .select("wilaya_id, price_home, price_desk, eta, is_active")
      .eq("store_id", id)
      .order("wilaya_id");

    const rateMap = new Map((dbRates || []).map((r: any) => [r.wilaya_id, r]));

    const result = RAW_WILAYAS.map((w: any) => {
      const custom = rateMap.get(w.id);
      return {
        wilaya_id: w.id,
        code: String(w.id).padStart(2, "0"),
        name: w.name,
        price_home: custom?.price_home ?? w.price_home,
        price_desk: custom?.price_desk ?? w.price_desk,
        eta: custom?.eta ?? w.eta,
        is_active: custom?.is_active ?? true,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
