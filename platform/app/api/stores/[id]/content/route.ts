import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";

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
    const patches = body.content_overrides;
    if (!patches || typeof patches !== "object") {
      return NextResponse.json({ detail: "content_overrides doit être un objet JSON" }, { status: 400 });
    }

    const currentData = (typeof check.store.content_overrides === "object" && check.store.content_overrides !== null)
      ? { ...check.store.content_overrides }
      : {};

    for (const [key, val] of Object.entries(patches)) {
      if (val === null) {
        delete currentData[key];
      } else {
        currentData[key] = val;
      }
    }

    const { data: updated, error } = await admin
      .from("stores")
      .update({ content_overrides: currentData })
      .eq("id", id)
      .select("content_overrides")
      .single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Contenu mis à jour avec succès",
      content_overrides: updated?.content_overrides || currentData,
    });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
