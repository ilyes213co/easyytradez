import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Boutique en ligne",
  description: "Boutique e-commerce propulsée par EasyTrade",
};

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body style={{ margin: 0, padding: 0, boxSizing: "border-box" }}>
        {children}
      </body>
    </html>
  );
}
