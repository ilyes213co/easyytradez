import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";
import { RAW_WILAYAS } from "@/lib/wilayas";

export async function PATCH(
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

    const body = await req.json();
    const priceHome = body.price_home !== undefined ? Number(body.price_home) : undefined;
    const priceDesk = body.price_desk !== undefined ? Number(body.price_desk) : undefined;

    // Upsert all 58 wilayas for this store
    const updates = RAW_WILAYAS.map((w: any) => ({
      store_id: id,
      wilaya_id: w.id,
      ...(priceHome !== undefined ? { price_home: priceHome } : {}),
      ...(priceDesk !== undefined ? { price_desk: priceDesk } : {}),
    }));

    try {
      await admin.from("shipping_rates").upsert(updates, { onConflict: "store_id,wilaya_id" });
    } catch (e: any) {
      console.warn("Shipping rates bulk update warning:", e);
    }

    return NextResponse.json({ message: "Tarifs de livraison mis à jour pour toutes les wilayas" });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
