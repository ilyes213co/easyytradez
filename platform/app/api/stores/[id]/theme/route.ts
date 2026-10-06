import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";

const ALLOWED_THEMES = new Set([
  "monochrome", "blossom-lavender", "phantom", "playful-pumpkin", "crimson",
  "natural", "energetic", "tuareg-indigo", "neo-brutalist", "luxe-noir", "modern", "luxury", "vibrant", "minimalist"
]);

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
    const theme = (body.theme || "").trim().toLowerCase();

    const { data: updated, error } = await admin
      .from("stores")
      .update({ theme })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Thème mis à jour avec succès", theme, store: updated });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
