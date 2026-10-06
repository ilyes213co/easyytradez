import type { ThemeScope } from "@/types/store";

export interface TemplateData {
  id: string;
  name: string;
  scope: ThemeScope;
  badge: string;
  category: string;
  headline: string;
  description: string;
  fonts: string;
  colors: {
    bg: string;
    surface: string;
    text: string;
    accent: string;
    accentSoft: string;
    border: string;
  };
  demoProduct: {
    name: string;
    price: number;
    wasPrice?: number;
    rating: number;
    reviewsCount: number;
    soldCount: number;
    vendor: string;
    description: string;
    tag: string;
  };
  sampleCategories: string[];
}

export const STORE_AND_FUNNEL_TEMPLATES: TemplateData[] = [
  {
    id: "crimson",
    name: "CRIMSON",
    scope: "funnel",
    badge: "Édition limitée",
    category: "Mode & Maroquinerie",
    headline: "Le cuir se patine. Le style reste.",
    description: "Vestes, sacs et ceintures en cuir pleine fleur, tannage végétal de caractère.",
    fonts: "Anton & Barlow",
    colors: {
      bg: "#faf7f6",
      surface: "#ffffff",
      text: "#181111",
      accent: "#9c1220",
      accentSoft: "#f8e7e8",
      border: "#e4d9d8",
    },
    demoProduct: {
      name: "Veste en cuir Bab El Oued",
      price: 42000,
      wasPrice: 56000,
      rating: 4.9,
      reviewsCount: 57,
      soldCount: 180,
      vendor: "Crimson Atelier",
      description: "Cuir de vachette pleine fleur, tannage végétal, 1,2 mm d'épaisseur. Se patine avec le temps.",
      tag: "Veste en cuir",
    },
    sampleCategories: ["Vestes", "Sacs", "Ceintures", "Chaussures"],
  },
  {
    id: "energetic",
    name: "PULSE",
    scope: "funnel",
    badge: "-30% cette semaine",
    category: "Audio, Sport & Tech",
    headline: "Bouge plus vite que tes excuses.",
    description: "Audio sport haute performance, vêtements techniques et accessoires testés en salle.",
    fonts: "Archivo",
    colors: {
      bg: "#f2f3f6",
      surface: "#ffffff",
      text: "#0f1116",
      accent: "#2f4dff",
      accentSoft: "#c4ff2e",
      border: "#dcdee6",
    },
    demoProduct: {
      name: "Écouteurs Pulse Air",
      price: 9900,
      wasPrice: 14000,
      rating: 4.6,
      reviewsCount: 241,
      soldCount: 1320,
      vendor: "Pulse Athletics",
      description: "Crochets d'oreille ergonomiques IPX7, 32 h d'autonomie avec boîtier, latence ultra-faible.",
      tag: "Écouteurs sport",
    },
    sampleCategories: ["Audio sport", "Vêtements", "Accessoires", "Nutrition"],
  },
  {
    id: "natural",
    name: "Terre de Kabylie",
    scope: "boutique",
    badge: "Récolte 2026",
    category: "Terroir & Produits Bio",
    headline: "De la terre de Kabylie à votre table.",
    description: "Huile d'olive extra vierge, miel pur et produits de coopératives locales sans intermédiaire.",
    fonts: "Newsreader & Work Sans",
    colors: {
      bg: "#f7f5ee",
      surface: "#fffdf7",
      text: "#232a1e",
      accent: "#4e6b39",
      accentSoft: "#e7eeda",
      border: "#ddd9c8",
    },
    demoProduct: {
      name: "Huile d'olive extra vierge 1 L",
      price: 2300,
      wasPrice: 2900,
      rating: 4.9,
      reviewsCount: 418,
      soldCount: 5200,
      vendor: "Coopérative de Bouira",
      description: "Olives Chemlal cueillies à la main, première pression à froid sous 27 °C. Acidité 0,3 %.",
      tag: "Huile d'olive",
    },
    sampleCategories: ["Huiles", "Miel", "Épices", "Conserves"],
  },
  {
    id: "monochrome",
    name: "ORAN SUPPLY",
    scope: "boutique",
    badge: "Minimaliste suisse",
    category: "Montres & Design épuré",
    headline: "Des objets qui durent, pas qui crient.",
    description: "Montres, maroquinerie sobre et essentiels choisis pour leur précision intemporelle.",
    fonts: "Schibsted Grotesk",
    colors: {
      bg: "#ffffff",
      surface: "#ffffff",
      text: "#0d0d0d",
      accent: "#0d0d0d",
      accentSoft: "#f2f2f2",
      border: "#e4e4e4",
    },
    demoProduct: {
      name: "Montre Kairos 38",
      price: 18900,
      wasPrice: 24500,
      rating: 4.8,
      reviewsCount: 126,
      soldCount: 940,
      vendor: "Kairos",
      description: "Boîtier acier brossé 38 mm, verre saphir anti-reflets, mouvement quartz japonais Miyota.",
      tag: "Montre",
    },
    sampleCategories: ["Montres", "Bureau", "Outils", "Maison"],
  },
  {
    id: "luxe-noir",
    name: "MAISON NOIR",
    scope: "boutique",
    badge: "Parfumerie de prestige",
    category: "Luxe & Haute Parfumerie",
    headline: "Un sillage qu'on n'oublie pas.",
    description: "Eaux de parfum composées avec des essences rares, flacons gravables offerts.",
    fonts: "Cormorant Garamond & Jost",
    colors: {
      bg: "#0b0b0c",
      surface: "#0f0f11",
      text: "#eae5dc",
      accent: "#c6a76a",
      accentSoft: "rgba(198,167,106,0.14)",
      border: "#2a2722",
    },
    demoProduct: {
      name: "Nuit d'Oran — Eau de parfum 100 ml",
      price: 28000,
      wasPrice: 35000,
      rating: 4.9,
      reviewsCount: 142,
      soldCount: 760,
      vendor: "Maison Noir",
      description: "Concentration 22 %, sillage boisé ambré envoûtant. Bergamote, néroli, ambre gris et cèdre.",
      tag: "Eau de parfum",
    },
    sampleCategories: ["Parfums", "Bougies", "Coffrets", "Accessoires"],
  },
  {
    id: "tuareg-indigo",
    name: "Tinariwen",
    scope: "boutique",
    badge: "Fait main à Tamanrasset",
    category: "Bijoux & Artisanat du Sud",
    headline: "Chaque pièce porte la main qui l'a gravée.",
    description: "Bijoux, argenterie et textiles touaregs façonnés par les maîtres artisans du Hoggar.",
    fonts: "Amiri & Cairo",
    colors: {
      bg: "#f6f1e5",
      surface: "#fffcf4",
      text: "#1e2350",
      accent: "#2c3b7d",
      accentSoft: "#e3e5f1",
      border: "#ded2ba",
    },
    demoProduct: {
      name: "Collier touareg en argent",
      price: 16500,
      wasPrice: 21000,
      rating: 5.0,
      reviewsCount: 64,
      soldCount: 230,
      vendor: "Artisans du Hoggar",
      description: "Croix d'Agadez en argent massif 925 gravée au burin, cordon de coton teint à l'indigo.",
      tag: "Bijoux en argent",
    },
    sampleCategories: ["Bijoux", "Textiles", "Maroquinerie", "Décoration"],
  },
  {
    id: "playful-pumpkin",
    name: "Yalla Kids",
    scope: "boutique",
    badge: "Spécial rentrée",
    category: "Enfants & Fournitures",
    headline: "Prêts pour l'école, prêts à jouer.",
    description: "Cartables ergonomiques, trousses et accessoires ludiques conçus pour résister à la cour.",
    fonts: "Fredoka & Nunito",
    colors: {
      bg: "#fff8ef",
      surface: "#ffffff",
      text: "#34241a",
      accent: "#ef7b1c",
      accentSoft: "#ffeeda",
      border: "#f3d9bd",
    },
    demoProduct: {
      name: "Sac à dos Yalla 18 L",
      price: 4200,
      wasPrice: 5600,
      rating: 4.8,
      reviewsCount: 204,
      soldCount: 1580,
      vendor: "Yalla Kids",
      description: "Polyester 600D déperlant, dos matelassé et bretelles renforcées. Trousse assortie offerte.",
      tag: "Sac à dos",
    },
    sampleCategories: ["Cartables", "Fournitures", "Vêtements", "Jeux"],
  },
  {
    id: "neo-brutalist",
    name: "BLOC",
    scope: "funnel",
    badge: "Drop 03 — Limité",
    category: "Sneakers & Streetwear",
    headline: "QUAND C'EST PARTI, C'EST PARTI.",
    description: "Sneakers et streetwear en drops numérotés sans réassort, esthétique brute et affirmée.",
    fonts: "Space Mono & DM Sans",
    colors: {
      bg: "#fffdf0",
      surface: "#ffffff",
      text: "#000000",
      accent: "#ffd400",
      accentSoft: "#fff0a8",
      border: "#000000",
    },
    demoProduct: {
      name: "Sneakers Bloc 01",
      price: 13500,
      wasPrice: 17000,
      rating: 4.7,
      reviewsCount: 95,
      soldCount: 520,
      vendor: "Bloc 01",
      description: "Cuir pleine fleur et toile coton, semelle gomme vulcanisée cousue-collée. Drop exclusif.",
      tag: "Sneakers",
    },
    sampleCategories: ["Sneakers", "Vêtements", "Casquettes", "Accessoires"],
  },
  {
    id: "phantom",
    name: "PHANTOM",
    scope: "funnel",
    badge: "E-Sport & Latence 0",
    category: "Gaming & Périphériques",
    headline: "Latence basse, patience courte.",
    description: "Matériel gaming sans fil de pointe testé pour la compétition en tournoi.",
    fonts: "Space Grotesk & Inter Tight",
    colors: {
      bg: "#08090d",
      surface: "#0e1016",
      text: "#e9edf5",
      accent: "#2fd9e8",
      accentSoft: "rgba(47,217,232,0.14)",
      border: "#222836",
    },
    demoProduct: {
      name: "Casque Phantom X7",
      price: 23500,
      wasPrice: 31000,
      rating: 4.7,
      reviewsCount: 88,
      soldCount: 410,
      vendor: "Phantom Gear",
      description: "Transducteurs 50 mm, sans fil 2,4 GHz < 25 ms, 40 h d'autonomie et micro antibruit.",
      tag: "Casque gamer",
    },
    sampleCategories: ["Audio", "Claviers", "Souris", "Accessoires"],
  },
  {
    id: "blossom-lavender",
    name: "Blossom",
    scope: "boutique",
    badge: "Best-seller Beauté",
    category: "Cosmétique & Skincare",
    headline: "Prenez soin de votre peau comme d'un jardin.",
    description: "Formules douces dermatologiques formulées à la rose d'Atlas et extraits floraux.",
    fonts: "Fraunces & Karla",
    colors: {
      bg: "#fbf6fb",
      surface: "#ffffff",
      text: "#3a2a41",
      accent: "#8b62c4",
      accentSoft: "#f1e7fb",
      border: "#ecdff1",
    },
    demoProduct: {
      name: "Coffret Rose d'Atlas",
      price: 7400,
      wasPrice: 9800,
      rating: 4.9,
      reviewsCount: 312,
      soldCount: 2140,
      vendor: "Blossom Skin",
      description: "Gel nettoyant doux, eau de rose distillée 120 ml, crème hydratante et baume lèvres.",
      tag: "Soin visage",
    },
    sampleCategories: ["Visage", "Corps", "Cheveux", "Bien-être"],
  },
];

export function getTemplatesForScope(scope: "boutique" | "funnel"): TemplateData[] {
  return STORE_AND_FUNNEL_TEMPLATES.filter(
    (t) => t.scope === scope || t.scope === "both"
  );
}
