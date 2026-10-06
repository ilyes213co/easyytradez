import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("store_id");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    if (!storeId) {
      return NextResponse.json({ detail: "store_id est requis" }, { status: 400 });
    }

    const admin = getAdminClient();
    let query = admin
      .from("products")
      .select("*")
      .eq("store_id", storeId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: false });

    if (category) {
      query = query.eq("category", category);
    }
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data: products, error } = await query;
    if (error) {
      console.error("Fetch products error:", error);
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json(products || []);
  } catch (err: any) {
    console.error("GET /api/products error:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const storeId = body.store_id;
    if (!storeId) {
      return NextResponse.json({ detail: "store_id est requis" }, { status: 400 });
    }

    const admin = getAdminClient();
    const check = await verifyStoreOwner(storeId, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const name = (body.name || body.title || "").trim();
    if (!name) {
      return NextResponse.json({ detail: "Le nom du produit est requis." }, { status: 400 });
    }

    const price = Number(body.price);
    if (isNaN(price) || price <= 0) {
      return NextResponse.json({ detail: "Le prix doit être supérieur à 0." }, { status: 400 });
    }

    // Auto-calculate position
    const { count } = await admin
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId);

    const position = count ?? 0;

    // Normalize images
    const rawImages = Array.isArray(body.images) ? body.images : [];
    const normalizedImages = rawImages.map((img: any, idx: number) => {
      if (typeof img === "string") {
        return { url: img, public_id: `img_${Date.now()}_${idx}` };
      }
      if (img && typeof img === "object") {
        return {
          url: img.url || "",
          public_id: img.public_id || `img_${Date.now()}_${idx}`,
        };
      }
      return null;
    }).filter(Boolean);

    const productData = {
      store_id: storeId,
      name,
      price,
      original_price: body.original_price ? Number(body.original_price) : null,
      description: body.description || "",
      category: body.category || "Général",
      stock_quantity: Number(body.stock_quantity ?? body.inventory_quantity ?? 50),
      images: normalizedImages,
      options: Array.isArray(body.options) ? body.options : [],
      is_featured: Boolean(body.is_featured ?? false),
      status: body.status || "active",
      position,
    };

    const { data: created, error } = await admin
      .from("products")
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.error("Create product error:", error);
      return NextResponse.json({ detail: `Erreur Supabase: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/products exception:", err);
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
