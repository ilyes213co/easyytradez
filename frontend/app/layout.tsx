import type { Metadata } from "next";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import "@/styles/themes/index.css";

export const metadata: Metadata = {
  title: "Boutique en ligne",
  description: "Plateforme e-commerce propulsée par StoreGen DZ",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  // Lecture du store depuis l'en-tête ou store actif par défaut
  let theme = "monochrome";
  let store: any = null;
  try {
    const { data: storeData } = await supabase
      .from("stores")
      .select("theme, brand_accent, logo_url")
      .limit(1)
      .single();

    if (storeData) {
      store = storeData;
      if (storeData.theme) {
        theme = storeData.theme;
      }
    }
  } catch (err) {
    console.warn("Thème par défaut appliqué (monochrome):", err);
  }

  const inlineBrandingStyles: React.CSSProperties = {
    ...(store?.brand_accent
      ? ({
          "--accent": store.brand_accent,
          "--focus": store.brand_accent,
          "--accent-text": store.brand_accent,
          "--accent-soft": `color-mix(in srgb, ${store.brand_accent} 15%, transparent)`,
        } as any)
      : {}),
    ...(store?.logo_url ? ({ "--brand-logo": `url("${store.logo_url}")` } as any) : {}),
  };

  return (
    <html lang="fr" data-theme={theme} dir="ltr" style={inlineBrandingStyles}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Anton&family=Archivo:ital,wght@0,400;0,600;0,700;0,900;1,700&family=Barlow:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Cairo:wght@400;600;700;800;900&family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,700;1,9..144,400&family=Fredoka:wght@400;500;600;700&family=Inter+Tight:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Jost:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Karla:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=Nunito:ital,wght@0,400;0,600;0,700;0,800;1,400&family=Schibsted+Grotesk:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Work+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
