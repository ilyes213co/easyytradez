import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";
import { uploadImageFile } from "@/lib/cloudinary";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const storeId = formData.get("store_id") as string | null;

    if (!file) {
      return NextResponse.json({ detail: "Fichier logo manquant" }, { status: 400 });
    }

    if (!storeId) {
      return NextResponse.json({ detail: "store_id manquant" }, { status: 400 });
    }

    const admin = getAdminClient();
    const check = await verifyStoreOwner(storeId, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const folder = `marchand/${storeId}/logos`;
    const result = await uploadImageFile(file, folder, storeId);

    // Also optionally update the store logo_url directly
    try {
      await admin.from("stores").update({ logo_url: result.url }).eq("id", storeId);
    } catch (e) {
      console.warn("Could not auto-update store logo_url:", e);
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("POST /api/upload/logo error:", err);
    return NextResponse.json({ detail: err.message || "Erreur lors de l'upload du logo" }, { status: 500 });
  }
}
