import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";

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

    return NextResponse.json(check.store);
  } catch (err: any) {
    console.error("GET /api/stores/[id] exception:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
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
    const check = await verifyStoreOwner(id, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const body = await req.json();

    // Prevent overwriting owner_id or id
    delete body.id;
    delete body.owner_id;

    // If type is updated, keep seo_metadata in sync
    if (body.type && check.store) {
      const currentMeta = (typeof check.store.seo_metadata === "object" && check.store.seo_metadata !== null)
        ? { ...check.store.seo_metadata }
        : {};
      currentMeta.type = body.type;
      body.seo_metadata = body.seo_metadata ? { ...body.seo_metadata, type: body.type } : currentMeta;
    }

    const { data: updated, error } = await admin
      .from("stores")
      .update(body)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Update store error:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("PATCH /api/stores/[id] exception:", err);
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
    const check = await verifyStoreOwner(id, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const { error } = await admin.from("stores").delete().eq("id", id);
    if (error) {
      console.error("Delete store error:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Boutique supprimée avec succès" });
  } catch (err: any) {
    console.error("DELETE /api/stores/[id] exception:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
