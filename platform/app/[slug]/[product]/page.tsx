import { getSupabaseServerClient } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductPage, { DEFAULT_WILAYAS } from "@/components/ProductPage";
import type { Product as GenericProduct, Store as GenericStore, Wilaya } from "@/types/product";

interface PageProps {
  params: Promise<{ slug: string; product: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, product: productSlug } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("slug", slug)
    .single();

  const s = store as any;
  if (!s) return { title: "Produit introuvable" };

  const { data: product } = await supabase
    .from("products")
    .select("name, description, images, price")
    .eq("store_id", s.id)
    .eq("slug", productSlug)
    .single();

  const p = product as any;
  if (!p) return { title: "Produit introuvable" };

  const firstImage = Array.isArray(p.images) && p.images[0]
    ? typeof p.images[0] === "string" ? p.images[0] : p.images[0].url
    : null;

  return {
    title: `${p.name} — ${s.name}`,
    description: p.description ?? `${p.name} à ${p.price?.toLocaleString()} DZD`,
    openGraph: {
      title: `${p.name} — ${s.name}`,
      description: p.description ?? undefined,
      images: firstImage ? [{ url: firstImage }] : [],
    },
  };
}

export default async function ProductDetailsPage({ params }: PageProps) {
  const { slug, product: productSlug } = await params;
  const supabase = await getSupabaseServerClient();

  // 1. Charger la boutique
  const { data: storeData } = await supabase
    .from("stores")
    .select("*")
    .eq("slug", slug)
    .single();

  const storeRaw = storeData as any;
  if (!storeRaw || storeRaw.status === "suspended") notFound();

  // 2. Charger le produit
  const { data: productData } = await supabase
    .from("products")
    .select("*")
    .eq("store_id", storeRaw.id)
    .eq("slug", productSlug)
    .single();

  const productRaw = productData as any;
  if (!productRaw || productRaw.status === "archived") notFound();

  // 3. Charger les 58 wilayas depuis Supabase (avec fallback gracieux)
  let wilayas: Wilaya[] = DEFAULT_WILAYAS;
  try {
    const { data: dbWilayas } = await supabase
      .from("wilayas")
      .select("*")
      .order("id");
    if (dbWilayas && dbWilayas.length > 0) {
      wilayas = dbWilayas as Wilaya[];
    }
  } catch {
    // Si la table n'a pas encore été créée dans Supabase, utiliser les 58 wilayas par défaut
    wilayas = DEFAULT_WILAYAS;
  }

  // Normalisation des images
  const images: string[] = Array.isArray(productRaw.images)
    ? productRaw.images
        .map((img: any) => (typeof img === "string" ? img : img?.url || ""))
        .filter(Boolean)
    : [];

  const genericProduct: GenericProduct = {
    id: productRaw.id,
    store_id: productRaw.store_id,
    name: productRaw.name,
    slug: productRaw.slug,
    description: productRaw.description || "",
    price: Number(productRaw.price || 0),
    original_price: productRaw.original_price ? Number(productRaw.original_price) : null,
    category: productRaw.category || "",
    stock_quantity: Number(productRaw.stock_quantity ?? productRaw.stock ?? 0),
    images: images,
    options: Array.isArray(productRaw.options) ? productRaw.options : [],
    is_featured: Boolean(productRaw.is_featured),
    status: productRaw.status || "active",
  };

  const genericStore: GenericStore = {
    id: storeRaw.id,
    name: storeRaw.name,
    slug: storeRaw.slug,
    theme: storeRaw.theme || "monochrome",
    description: storeRaw.description,
    slogan: storeRaw.slogan,
    whatsapp_phone: storeRaw.whatsapp_phone,
    city: storeRaw.city,
    logo_url: storeRaw.logo_url,
    cover_url: storeRaw.cover_url,
  };

  return <ProductPage product={genericProduct} store={genericStore} wilayas={wilayas} />;
}
