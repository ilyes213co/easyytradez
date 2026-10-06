import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";

async function verifyProductOwner(productId: string, userId: string, admin: any) {
  const { data: product, error } = await admin
    .from("products")
    .select("*, stores(owner_id)")
    .eq("id", productId)
    .maybeSingle();

  if (error || !product) {
    return { ok: false as const, status: 404, message: "Produit introuvable", product: null };
  }

  const storeOwnerId = product.stores?.owner_id;
  if (storeOwnerId !== userId) {
    return { ok: false as const, status: 403, message: "Accès refusé", product: null };
  }

  return { ok: true as const, status: 200, message: "OK", product };
}

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
    const check = await verifyProductOwner(id, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const body = await req.json();
    delete body.id;
    delete body.store_id;

    if (body.images && Array.isArray(body.images)) {
      body.images = body.images.map((img: any, idx: number) => {
        if (typeof img === "string") {
          return { url: img, public_id: `img_${Date.now()}_${idx}` };
        }
        return img;
      });
    }

    const { data: updated, error } = await admin
      .from("products")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update product error:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/products/[id] exception:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}

export async function DELETE(
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
    const check = await verifyProductOwner(id, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const { error } = await admin.from("products").delete().eq("id", id);
    if (error) {
      console.error("Delete product error:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Produit supprimé avec succès" });
  } catch (err: any) {
    console.error("DELETE /api/products/[id] exception:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
