import type { Metadata } from "next";
import { Toaster } from "sonner";
import Providers from "@/components/providers";
import "./globals.css";
import "@/styles/themes/index.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://easytradez.site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "EasyTrade — Créer votre Boutique en Ligne en Algérie | E-Commerce 58 Wilayas",
    template: "%s | EasyTrade Algérie",
  },
  description:
    "La plateforme e-commerce n°1 en Algérie. Créez votre boutique en 5 minutes avec paiement à la livraison (COD), intégration Yalidine & ZR Express, passerelle BaridiMob/CIB et génération par IA.",
  keywords: [
    "créer boutique en ligne algérie",
    "shopify algérie",
    "e-commerce algérie",
    "boutique en ligne 58 wilayas",
    "paiement à la livraison algérie",
    "yalidine express",
    "zr express",
    "baridimob e-commerce",
    "edahabia cib",
    "dropshipping algérie",
    "easytrade",
    "easytradez.site",
  ],
  authors: [{ name: "EasyTrade", url: siteUrl }],
  creator: "EasyTrade",
  publisher: "EasyTrade",
  applicationName: "EasyTrade",
  alternates: {
    canonical: siteUrl,
    languages: {
      "fr-DZ": siteUrl,
      "ar-DZ": siteUrl,
    },
  },
  openGraph: {
    type: "website",
    locale: "fr_DZ",
    alternateLocale: ["ar_DZ"],
    url: siteUrl,
    siteName: "EasyTrade",
    title: "EasyTrade — Créer votre Boutique en Ligne en Algérie",
    description:
      "Votre boutique e-commerce professionnelle en 5 minutes. Paiement à la livraison (COD), expédition 58 wilayas, Yalidine & BaridiMob.",
  },
  twitter: {
    card: "summary_large_image",
    title: "EasyTrade — Plateforme E-Commerce Algérie",
    description: "Créez votre boutique en ligne en 5 minutes. 58 wilayas, COD et IA.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "EasyTrade",
      url: siteUrl,
      logo: `${siteUrl}/icon.svg`,
      description: "Plateforme SaaS e-commerce pour créateurs et marchands en Algérie.",
    },
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "EasyTrade",
      publisher: { "@id": `${siteUrl}/#organization` },
      inLanguage: ["fr-DZ", "ar-DZ"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#application`,
      name: "EasyTrade Platform",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "DZD",
          name: "Plan Gratuit",
        },
        {
          "@type": "Offer",
          price: "2000",
          priceCurrency: "DZD",
          name: "Plan Pro",
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Alexandria:wght@400;600;700;900&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Cairo:wght@500;700;900&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&family=Fraunces:opsz,wght@9..144,700;9..144,900&family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;600;700;800;900&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Readex+Pro:wght@400;600;700&family=Sora:wght@400;600;700;800&family=Space+Grotesk:wght@500;700&family=Syne:wght@700;800;900&family=Unbounded:wght@700;900&family=Urbanist:wght@500;700;800;900&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-[#06060f] text-white font-sans antialiased selection:bg-[#2540ea] selection:text-white">
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "rgba(10, 14, 38, 0.95)",
              border: "1px solid rgba(96, 165, 250, 0.4)",
              color: "#ffffff",
              backdropFilter: "blur(16px)",
              borderRadius: "14px",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
