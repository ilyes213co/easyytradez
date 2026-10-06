import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, getUniqueStoreSlug, safeInsert } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const storeType = searchParams.get("type"); // "boutique" | "funnel"

    const admin = getAdminClient();
    let query = admin
      .from("stores")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    if (storeType) {
      query = query.eq("type", storeType);
    }

    const { data: stores, error } = await query;
    if (error) {
      console.error("Error fetching stores:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(stores || []);
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

    // Ensure user profile exists to satisfy foreign key constraint on stores(owner_id)
    try {
      await admin.from("profiles").upsert(
        {
          id: user.id,
          full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Commerçant",
          plan: "free",
        },
        { onConflict: "id" }
      );
    } catch (e) {
      console.warn("Profile upsert warning:", e);
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
