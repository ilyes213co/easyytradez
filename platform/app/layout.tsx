import type { Metadata } from "next";
import { Toaster } from "sonner";
import Providers from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "EasyTrade — Plateforme E-Commerce Algérie",
    template: "%s | EasyTrade",
  },
  description:
    "Votre boutique en ligne en 5 minutes. Une infrastructure e-commerce tout-en-un pensée pour le marché algérien (COD 58 Wilayas, Yalidine, ZR Express).",
  keywords: ["boutique en ligne", "e-commerce", "Algérie", "COD", "EasyTrade", "yalidine", "zr express"],
  authors: [{ name: "EasyTrade" }],
  creator: "EasyTrade",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.png",
  },
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#06060f] text-white antialiased" suppressHydrationWarning>
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
