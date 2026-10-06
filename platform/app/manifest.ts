import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EasyTrade — Plateforme E-Commerce Algérie",
    short_name: "EasyTrade",
    description: "Créez votre boutique en ligne en 5 minutes avec paiement à la livraison (COD) et expédition 58 wilayas.",
    start_url: "/",
    display: "standalone",
    background_color: "#06060f",
    theme_color: "#2540ea",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
