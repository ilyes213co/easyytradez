import type { Metadata } from "next";
import { Toaster } from "sonner";
import Providers from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StoreGen — Créez votre boutique en ligne",
    template: "%s | StoreGen",
  },
  description:
    "Créez et publiez votre boutique e-commerce en quelques minutes grâce à l'IA. Aucune compétence technique requise.",
  keywords: ["boutique en ligne", "e-commerce", "Algérie", "shopify algérie"],
  authors: [{ name: "StoreGen" }],
  creator: "StoreGen",
  openGraph: {
    type: "website",
    locale: "fr_DZ",
    url: process.env.NEXT_PUBLIC_APP_URL,
    siteName: "StoreGen",
    title: "StoreGen — Créez votre boutique en ligne",
    description: "Créez et publiez votre boutique e-commerce en quelques minutes grâce à l'IA.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 font-sans antialiased">
        <Providers>
          {children}
        </Providers>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { borderRadius: "10px", fontSize: "14px" },
          }}
        />
      </body>
    </html>
  );
}
