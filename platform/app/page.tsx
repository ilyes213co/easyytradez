import type { Metadata } from "next";
import LandingClient from "@/components/landing/LandingClient";
import { FAQ_QUESTIONS } from "@/lib/landing-data";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://easytradez.site";

export const metadata: Metadata = {
  title: "EasyTradez — Créez votre Boutique & Funnel en Ligne en Algérie (58 Wilayas)",
  description:
    "Plateforme e-commerce n°1 en Algérie conçue pour les marchands et créateurs. Lancez votre boutique ou funnel en 5 minutes avec paiement à la livraison (COD), intégration Yalidine & ZR Express, et comptabilité en DZD.",
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
    siteName: "EasyTradez",
    title: "EasyTradez — Créez votre Boutique en Ligne en Algérie | COD & 58 Wilayas",
    description:
      "Vendez partout en Algérie avec EasyTradez. Boutiques mobiles ultra-rapides, paiement à la livraison sécurisé, intégration Yalidine, ZR Express et BaridiMob.",
    images: [
      {
        url: `${siteUrl}/icon.svg`,
        width: 1200,
        height: 630,
        alt: "EasyTradez E-Commerce Algérie",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EasyTradez — Créez votre Boutique en Ligne en Algérie",
    description:
      "Lancez votre boutique e-commerce en 5 minutes. Paiement à la livraison 58 wilayas, Yalidine et zéro frais cachés.",
    images: [`${siteUrl}/icon.svg`],
  },
};

export default function HomePage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "EasyTradez",
        alternateName: ["EasyTrade", "Easy Tradez"],
        url: siteUrl,
        logo: `${siteUrl}/icon.svg`,
        description:
          "Plateforme SaaS e-commerce pour créateurs et marchands en Algérie. Vente en ligne, paiement à la livraison (COD) et logistique 58 wilayas.",
        address: {
          "@type": "PostalAddress",
          addressCountry: "DZ",
          addressLocality: "Oran",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: "EasyTradez",
        alternateName: ["EasyTrade", "Easy Tradez"],
        publisher: { "@id": `${siteUrl}/#organization` },
        inLanguage: ["fr-DZ", "ar-DZ"],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}/#application`,
        name: "EasyTradez Platform",
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
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}/#faq`,
        mainEntity: FAQ_QUESTIONS.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingClient />
    </>
  );
}
