import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";
import { FREE_THEMES } from "@/lib/plan-limits";
import { getUserPlan } from "@/lib/plan-limits-server";

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

    if (!ALLOWED_THEMES.has(theme)) {
      return NextResponse.json(
        { detail: `Thème '${theme}' invalide.` },
        { status: 400 }
      );
    }

    // Vérification du plan (thèmes premium réservés à Pro/Business)
    const planLimits = await getUserPlan(user.id, admin);
    if (!planLimits.canUseAllThemes && !FREE_THEMES.has(theme)) {
      return NextResponse.json(
        {
          detail: "PLAN_LIMIT_REACHED",
          code: "PLAN_LIMIT_REACHED",
          message: `Le thème '${theme}' est un thème premium réservé aux forfaits Pro et Business. Passez au forfait Pro pour l'activer.`,
          limit_type: "theme",
        },
        { status: 403 }
      );
    }

    const { data: updated, error } = await admin
      .from("stores")
      .update({ theme })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    if (updated?.slug) {
      try {
        revalidatePath(`/${updated.slug}`);
        revalidatePath(`/${updated.slug}/[product]`, "page");
      } catch (e) {
        // Cache revalidation failure ignored
      }
    }

    return NextResponse.json({ message: "Thème mis à jour avec succès", theme, store: updated });
  } catch (err: any) {
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
