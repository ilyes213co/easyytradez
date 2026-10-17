import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminClient, getAuthUser, verifyStoreOwner, safeUpdate } from "@/lib/api-auth";

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

    // Protection plan pour domaine personnalisé
    if (body.custom_domain && typeof body.custom_domain === "string" && body.custom_domain.trim()) {
      const { getUserPlan } = await import("@/lib/plan-limits-server");
      const userPlan = await getUserPlan(user.id, admin);
      if (!userPlan.canUseCustomDomain) {
        return NextResponse.json(
          {
            detail: "PLAN_LIMIT_REACHED",
            code: "PLAN_LIMIT_REACHED",
            message:
              "La connexion d'un nom de domaine personnalisé (.com, .dz) est réservée aux forfaits Pro et Business. Passez au Pack Pro pour connecter votre propre domaine !",
            limit_type: "domain",
          },
          { status: 403 }
        );
      }
    }

    // Protection plan pour multi-pixels (TikTok & Google Analytics)
    if (
      (body.tiktok_pixel_id && typeof body.tiktok_pixel_id === "string" && body.tiktok_pixel_id.trim()) ||
      (body.google_analytics_id && typeof body.google_analytics_id === "string" && body.google_analytics_id.trim())
    ) {
      const { getUserPlan } = await import("@/lib/plan-limits-server");
      const userPlan = await getUserPlan(user.id, admin);
      if (userPlan.plan === "free") {
        return NextResponse.json(
          {
            detail: "PLAN_LIMIT_REACHED",
            code: "PLAN_LIMIT_REACHED",
            message:
              "Le tracking multi-pixels (TikTok Pixel & Google Analytics) est réservé aux forfaits Pro et Business. Passez au Pack Pro pour débloquer le multi-tracking !",
            limit_type: "pixels",
          },
          { status: 403 }
        );
      }
    }

    // If type is updated, keep seo_metadata in sync
    if (body.type && check.store) {
      const currentMeta = (typeof check.store.seo_metadata === "object" && check.store.seo_metadata !== null)
        ? { ...check.store.seo_metadata }
        : {};
      currentMeta.type = body.type;
      body.seo_metadata = body.seo_metadata ? { ...body.seo_metadata, type: body.type } : currentMeta;
    }

    const { data: updated, error } = await safeUpdate("stores", body, "id", id, admin);

    if (error) {
      console.error("Update store error:", error);
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
