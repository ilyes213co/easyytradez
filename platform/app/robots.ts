import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://easytradez.site";

  // Routes strictement privées du back-office et API marchands
  const privateRoutes = [
    "/dashboard/",
    "/admin/",
    "/api/",
    "/preview/",
    "/auth/callback",
    "/_next/",
  ];

  // Crawlers moteurs de recherche et moteurs d'IA générative (GEO)
  const allowedBots = [
    "Googlebot",
    "Bingbot",
    "GPTBot",
    "ChatGPT-User",
    "OAI-SearchBot",
    "ClaudeBot",
    "PerplexityBot",
    "Google-Extended",
    "Applebot-Extended",
  ];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: privateRoutes,
      },
      ...allowedBots.map((bot) => ({
        userAgent: bot,
        allow: "/",
        disallow: [
          "/dashboard/",
          "/admin/",
          "/api/",
          "/preview/",
          "/auth/callback",
        ],
      })),
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
