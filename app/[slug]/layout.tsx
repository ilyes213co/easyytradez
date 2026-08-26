import type { Metadata } from "next";
import { getSupabaseServerClient } from "@/lib/supabase";
import { notFound } from "next/navigation";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase  = await getSupabaseServerClient();

  const { data: store } = await supabase
    .from("stores")
    .select("name, description, logo_url, cover_url")
    .eq("slug", slug)
    .eq("status", "active")
    .single();

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

export default async function StoreLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const supabase  = await getSupabaseServerClient();

  const { data: store } = await supabase
    .from("stores")
    .select("status")
    .eq("slug", slug)
    .single();

  if (!store || store.status === "suspended") notFound();

  return (
    <div className="min-h-screen bg-[#fafaf9]">
      {children}
    </div>
  );
}
