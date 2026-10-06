import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; wilayaId: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const { id, wilayaId } = params;
    const wilayaNum = parseInt(wilayaId, 10);
    if (isNaN(wilayaNum) || wilayaNum < 1 || wilayaNum > 58) {
      return NextResponse.json({ detail: "Wilaya invalide (1-58)" }, { status: 400 });
    }

    const admin = getAdminClient();
    const check = await verifyStoreOwner(id, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const body = await req.json();
    const updateData: Record<string, any> = {
      store_id: id,
      wilaya_id: wilayaNum,
    };
    if (body.price_home !== undefined) updateData.price_home = Number(body.price_home);
    if (body.price_desk !== undefined) updateData.price_desk = Number(body.price_desk);

    const { data: updated, error } = await admin
      .from("shipping_rates")
      .upsert(updateData, { onConflict: "store_id,wilaya_id" })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
