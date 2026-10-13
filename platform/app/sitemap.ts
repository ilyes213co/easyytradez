import { MetadataRoute } from "next";
import { getAdminClient } from "@/lib/api-auth";

export const revalidate = 3600; // Regénère le sitemap dynamiquement chaque heure

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://easytradez.site";
  const now = new Date();

  // Pages statiques publiques
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  try {
    const supabase = getAdminClient();

    // 1. Boutiques & funnels publiés
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, slug, updated_at, created_at, status")
      .in("status", ["published", "active"]);

    if (storesError || !stores) {
      console.warn("sitemap: impossible de récupérer les boutiques", storesError);
      return staticRoutes;
    }

    const storeMap = new Map<string, { slug: string; updated_at?: string }>();
    const storeRoutes: MetadataRoute.Sitemap = stores
      .filter((s) => s.slug)
      .map((s) => {
        storeMap.set(s.id, { slug: s.slug, updated_at: s.updated_at });
        return {
          url: `${baseUrl}/${s.slug}`,
          lastModified: s.updated_at ? new Date(s.updated_at) : now,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        };
      });

    // 2. Produits publics associés aux boutiques publiées
    const { data: products, error: productsError } = await supabase
      .from("products")
      .select("id, slug, store_id, updated_at, created_at, status")
      .in("status", ["active", "published"]);

    const productRoutes: MetadataRoute.Sitemap = [];
    if (!productsError && products) {
      for (const p of products) {
        const store = storeMap.get(p.store_id);
        if (!store) continue; // Uniquement si la boutique parente est publiée
        const productIdent = p.slug || p.id;
        if (!productIdent) continue;

        productRoutes.push({
          url: `${baseUrl}/${store.slug}/${productIdent}`,
          lastModified: p.updated_at ? new Date(p.updated_at) : now,
          changeFrequency: "weekly" as const,
          priority: 0.7,
        });
      }
    }

    return [...staticRoutes, ...storeRoutes, ...productRoutes];
  } catch (err) {
    console.error("sitemap: exception durant la génération", err);
    return staticRoutes;
  }
}
