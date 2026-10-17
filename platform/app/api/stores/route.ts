import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, getUniqueStoreSlug, safeInsert } from "@/lib/api-auth";
import { FREE_THEMES } from "@/lib/plan-limits";
import { getUserPlan } from "@/lib/plan-limits-server";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const storeType = searchParams.get("type");

    const admin = getAdminClient();
    let query = admin
      .from("stores")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (storeType && storeType !== "all") {
      query = query.eq("type", storeType);
    }

    const { data: stores, error } = await query;
    if (error) {
      console.error("Error fetching stores:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    if (stores && stores.length > 0) {
      return NextResponse.json(stores.map((s) => ({ ...s, user_role: "owner" })));
    }

    // Si pas de boutique en tant que propriétaire, vérifier l'appartenance à une équipe globale
    const userEmail = (user.email || "").toLowerCase();
    const { data: memberships } = await admin
      .from("store_members")
      .select("owner_id, store_id, role, status")
      .or(`user_id.eq.${user.id},email.eq.${userEmail},user_email.eq.${userEmail}`);

    const activeMemberships = (memberships || []).filter(
      (m: any) => m.status === "active" || m.status === "invited" || !m.status
    );

    const ownerIds = Array.from(new Set(activeMemberships.map((m: any) => m.owner_id).filter(Boolean)));

    if (ownerIds.length > 0) {
      let teamQuery = admin
        .from("stores")
        .select("*")
        .in("owner_id", ownerIds)
        .order("created_at", { ascending: false });

      if (storeType && storeType !== "all") {
        teamQuery = teamQuery.eq("type", storeType);
      }

      const { data: teamStores, error: teamErr } = await teamQuery;
      if (teamErr) {
        return NextResponse.json({ detail: teamErr.message }, { status: 500 });
      }

      return NextResponse.json((teamStores || []).map((s) => ({ ...s, user_role: "member" })));
    } else if (activeMemberships.length > 0) {
      const directStoreIds = activeMemberships.map((m: any) => m.store_id).filter(Boolean);
      if (directStoreIds.length > 0) {
        let directQuery = admin
          .from("stores")
          .select("*")
          .in("id", directStoreIds)
          .order("created_at", { ascending: false });

        if (storeType && storeType !== "all") {
          directQuery = directQuery.eq("type", storeType);
        }

        const { data: teamStores } = await directQuery;
        return NextResponse.json((teamStores || []).map((s) => ({ ...s, user_role: "member" })));
      }
    }

    return NextResponse.json([]);
  } catch (err: any) {
    console.error("GET /api/stores exception:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}


export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Veuillez vous connecter pour créer une boutique ou un funnel." }, { status: 401 });
    }

    const body = await req.json();
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ detail: "Le nom est requis." }, { status: 400 });
    }

    const admin = getAdminClient();

    // Ensure default profile exists without overwriting paid subscriptions
    try {
      await admin.from("profiles").upsert(
        {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Commerçant",
          plan: "free",
        },
        { onConflict: "id", ignoreDuplicates: true }
      );
    } catch (e) {
      console.warn("Profile upsert warning:", e);
    }

    // Enforce store quota based on user subscription tier
    const planLimits = await getUserPlan(user.id, admin);
    if (planLimits.storesLimit !== -1) {
      const { count: storeCount } = await admin
        .from("stores")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", user.id);

      if ((storeCount ?? 0) >= planLimits.storesLimit) {
        const msg = `Limite atteinte : votre forfait ${planLimits.planName} vous permet de créer au maximum ${planLimits.storesLimit} boutique(s). Passez à un forfait supérieur pour débloquer plus de boutiques.`;
        return NextResponse.json(
          {
            detail: "PLAN_LIMIT_REACHED",
            code: "PLAN_LIMIT_REACHED",
            message: msg,
            limit_type: "stores",
            limit: planLimits.storesLimit,
            current: storeCount ?? 0,
          },
          { status: 403 }
        );
      }
    }

    // Enforce theme gating on creation
    const requestedTheme = (body.theme || "crimson").trim().toLowerCase();
    if (!planLimits.canUseAllThemes && !FREE_THEMES.has(requestedTheme)) {
      return NextResponse.json(
        {
          detail: "PLAN_LIMIT_REACHED",
          code: "PLAN_LIMIT_REACHED",
          message: `Le thème '${requestedTheme}' est réservé aux forfaits Pro et Business. Choisissez un thème standard ou passez au forfait Pro.`,
          limit_type: "theme",
          limit: 0,
          current: 0,
        },
        { status: 403 }
      );
    }

    const slug = await getUniqueStoreSlug(body.slug || name, admin);
    const storeType = body.type === "funnel" ? "funnel" : "boutique";

    const seoMetadata = typeof body.seo_metadata === "object" && body.seo_metadata !== null
      ? { ...body.seo_metadata, type: storeType }
      : { type: storeType };

    if (body.custom_domain) seoMetadata.custom_domain = body.custom_domain;
    if (body.facebook_pixel_id) seoMetadata.facebook_pixel_id = body.facebook_pixel_id;
    if (body.tiktok_pixel_id) seoMetadata.tiktok_pixel_id = body.tiktok_pixel_id;

    const contentOverrides = typeof body.content_overrides === "object" && body.content_overrides !== null
      ? { ...body.content_overrides }
      : {};

    if (body.payment_settings) {
      contentOverrides.payment_settings = body.payment_settings;
    }

    const storeData: Record<string, any> = {
      owner_id: user.id,
      name,
      slug,
      description: body.description || null,
      primary_color: body.primary_color || "#6366f1",
      whatsapp_phone: body.whatsapp_phone || null,
      theme: body.theme || "crimson",
      animation_style: body.animation_style || "soft",
      type: storeType,
      status: "published",
      category: body.category || null,
      font_family: body.font_family || "modern",
      logo_url: body.logo_url || null,
      seo_metadata: seoMetadata,
      content_overrides: contentOverrides,
    };

    const { data: created, error } = await safeInsert("stores", storeData, admin);

    if (error) {
      console.error("Supabase insert store error:", error);
      return NextResponse.json({ detail: `Erreur Supabase: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/stores exception:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
