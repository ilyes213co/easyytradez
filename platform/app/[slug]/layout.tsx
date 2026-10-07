import type { Metadata } from "next";
import { getAdminClient } from "@/lib/api-auth";
import { notFound } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }> | { slug: string };
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  if (!slug) return { title: "Boutique introuvable" };

  const supabase = getAdminClient();

  const { data: store } = await supabase
    .from("stores")
    .select("name, description, logo_url, cover_url, status")
    .eq("slug", slug)
    .in("status", ["published", "active", "draft"])
    .maybeSingle();

  if (!store) return { title: "Boutique introuvable" };

  return {
    title: store.name,
    description: store.description ?? `Découvrez les produits de ${store.name}`,
    openGraph: {
      title: store.name,
      description: store.description ?? `Découvrez les produits de ${store.name}`,
      images: store.cover_url ? [{ url: store.cover_url }] : store.logo_url ? [{ url: store.logo_url }] : [],
      type: "website",
    },
    twitter: { card: "summary_large_image", title: store.name },
  };
}

import BrandInjector from "@/components/BrandInjector";

export default async function StoreLayout({ children, params }: LayoutProps) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug;
  if (!slug) notFound();

  const supabase = getAdminClient();

  const { data: store } = await supabase
    .from("stores")
    .select("status, theme, primary_color, logo_url")
    .eq("slug", slug)
    .maybeSingle();

  if (!store || store.status === "suspended") notFound();

  const theme = store.theme || "monochrome";

  return (
    <>
      <BrandInjector
        theme={theme as any}
        brandAccent={store.primary_color}
        logoUrl={store.logo_url}
      />
      <div data-theme={theme} className="min-h-screen">
        {children}
      </div>
    </>
  );
}
