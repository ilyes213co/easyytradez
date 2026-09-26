// platform/lib/niche-defaults.ts
// Configuration des niches et suggestions pour la création de boutique

export interface NicheInfo {
  id: string;
  name: string;
  icon: string;
  defaultDescription: string;
  suggestedProducts: Array<{
    title: string;
    price: string;
    icon: string;
  }>;
}

export const NICHES: NicheInfo[] = [
  {
    id: "mode",
    name: "Mode & Vêtements",
    icon: "👕",
    defaultDescription: "La meilleure sélection de vêtements et tenues tendance en Algérie.",
    suggestedProducts: [
      { title: "T-Shirt Oversize Coton Lourd", price: "3400", icon: "👕" },
      { title: "Pantalon Cargo Tendance", price: "5200", icon: "👖" },
      { title: "Veste Bomber Urbaine", price: "8900", icon: "🧥" },
      { title: "Sweat à Capuche Confort", price: "5600", icon: "🧶" },
    ],
  },
  {
    id: "sneakers",
    name: "Chaussures & Baskets",
    icon: "👟",
    defaultDescription: "Baskets, sneakers et chaussures tendance livrées partout en Algérie.",
    suggestedProducts: [
      { title: "Sneaker Rétro Cuir & Daim", price: "7800", icon: "👟" },
      { title: "Baskets Running Amorti Pro", price: "6900", icon: "🏃" },
      { title: "Mocassins Cuir Véritable", price: "9500", icon: "👞" },
      { title: "Claquettes Ergonomiques", price: "2500", icon: "🩴" },
    ],
  },
  {
    id: "sport",
    name: "Sport & Musculation",
    icon: "💪",
    defaultDescription: "Équipements de sport, haltères et tenues d'entraînement haute performance.",
    suggestedProducts: [
      { title: "Haltères Réglables Pro 20kg", price: "14500", icon: "🏋️" },
      { title: "Ceinture de Force Cuir", price: "5800", icon: "🥊" },
      { title: "Kit 5 Bandes de Résistance", price: "3400", icon: "⚡" },
      { title: "T-Shirt Compression Sport", price: "2900", icon: "👕" },
    ],
  },
  {
    id: "nutrition",
    name: "Compléments Alimentaires",
    icon: "💊",
    defaultDescription: "Protéines, vitamines et nutrition sportive 100% certifiées d'origine.",
    suggestedProducts: [
      { title: "Whey Isolate Pure 2kg", price: "12500", icon: "💪" },
      { title: "Créatine Micronisée 300g", price: "4200", icon: "⚡" },
      { title: "Oméga 3 Forte — 120 Gélules", price: "3200", icon: "🐟" },
      { title: "BCAA Récupération 400g", price: "4800", icon: "🥤" },
    ],
  },
  {
    id: "beaute",
    name: "Cosmétiques & Beauté",
    icon: "💄",
    defaultDescription: "Soins du visage, rituels capillaires et maquillage de qualité supérieure.",
    suggestedProducts: [
      { title: "Sérum Éclat Vitamine C 30ml", price: "3600", icon: "✨" },
      { title: "Crème Hydratante Acide Hyaluronique", price: "2900", icon: "🧴" },
      { title: "Huile de Romarin Repousse Cheveux", price: "2400", icon: "🌿" },
      { title: "Rouge à Lèvres Mat Longue Tenue", price: "1800", icon: "💄" },
    ],
  },
  {
    id: "tech",
    name: "Électronique & High-Tech",
    icon: "📱",
    defaultDescription: "Smartphones, écouteurs sans fil, montres connectées et gadgets innovants.",
    suggestedProducts: [
      { title: "Écouteurs Sans Fil Réduction Bruit", price: "5800", icon: "🎧" },
      { title: "Montre Connectée Sport AMOLED", price: "7900", icon: "⌚" },
      { title: "Batterie Externe 20 000mAh", price: "4200", icon: "🔋" },
      { title: "Support Téléphone Voiture MagSafe", price: "2900", icon: "🚗" },
    ],
  },
  {
    id: "maison",
    name: "Maison & Décoration",
    icon: "🏡",
    defaultDescription: "Décoration contemporaine, luminaires design et linge de maison élégant.",
    suggestedProducts: [
      { title: "Lampe Sans Fil Tactile Dorée", price: "4600", icon: "💡" },
      { title: "Parure de Lit Coton Satiné", price: "9200", icon: "🛏️" },
      { title: "Vase Céramique Design Minimal", price: "3400", icon: "🏺" },
      { title: "Tapis Salon Berbère Doux", price: "8500", icon: "🧶" },
    ],
  },
  {
    id: "cuisine",
    name: "Cuisine & Électroménager",
    icon: "🍳",
    defaultDescription: "Appareils culinaires malins et ustensiles professionnels pour la cuisine.",
    suggestedProducts: [
      { title: "Friteuse Sans Huile Air Fryer 6L", price: "14900", icon: "🍟" },
      { title: "Hachoir Électrique Multifonction Inox", price: "4200", icon: "🔪" },
      { title: "Set 3 Poêles Granit Antiadhésives", price: "7900", icon: "🍳" },
      { title: "Mélangeur Plongeant 4-en-1 1000W", price: "5400", icon: "🥣" },
    ],
  },
  {
    id: "parfums",
    name: "Parfumerie & Senteurs",
    icon: "🧴",
    defaultDescription: "Eaux de parfum raffinées, muscs précieux d'Orient et encens bakhour.",
    suggestedProducts: [
      { title: "Eau de Parfum Oud Royal 100ml", price: "6800", icon: "🪵" },
      { title: "Extrait de Parfum Vanille 50ml", price: "5400", icon: "🌸" },
      { title: "Musc Blanc Pur d'Orient 12ml", price: "1800", icon: "🤍" },
      { title: "Bakhour Traditionnel d'Oman 100g", price: "2800", icon: "💨" },
    ],
  },
  {
    id: "sante",
    name: "Santé & Bien-être",
    icon: "🌿",
    defaultDescription: "Accessoires orthopédiques, massage thérapeutique et bien-être quotidien.",
    suggestedProducts: [
      { title: "Pistolet de Massage Musculaire", price: "7400", icon: "🔫" },
      { title: "Coussin Ergonomique Mémoire de Forme", price: "3800", icon: "😴" },
      { title: "Correcteur de Posture Dos", price: "2600", icon: "🧍" },
      { title: "Ceinture Lombaire Chauffante", price: "4500", icon: "🔥" },
    ],
  },
  {
    id: "bebe",
    name: "Bébé & Enfants",
    icon: "👶",
    defaultDescription: "Vêtements doux, jouets d'éveil et accessoires de puériculture indispensables.",
    suggestedProducts: [
      { title: "Gigoteuse Coton Bio 4 Saisons", price: "3800", icon: "🌙" },
      { title: "Tapis d'Éveil Musical Bébé", price: "6200", icon: "🧸" },
      { title: "Sac à Langer Multifonction", price: "4900", icon: "🎒" },
      { title: "Set Repas Silicone Sans BPA", price: "2800", icon: "🥣" },
    ],
  },
  {
    id: "terroir",
    name: "Artisanat & Terroir DZ",
    icon: "🫒",
    defaultDescription: "Huile d'olive pure de Kabylie, miel sauvage et artisanat traditionnel algérien.",
    suggestedProducts: [
      { title: "Huile d'Olive Extra Vierge Kabylie 1L", price: "2200", icon: "🫒" },
      { title: "Miel Pur de Jujubier Sidr 500g", price: "4500", icon: "🍯" },
      { title: "Plat Poterie Kabyle Fait Main", price: "3400", icon: "🏺" },
      { title: "Bracelet Berbère Argent Massif", price: "9800", icon: "💍" },
    ],
  },
  {
    id: "auto",
    name: "Auto & Moto",
    icon: "🚗",
    defaultDescription: "Accessoires d'habitacle, éclairage LED et outillage pour véhicules.",
    suggestedProducts: [
      { title: "Aspirateur Voiture Puissant Sans Fil", price: "4600", icon: "🧹" },
      { title: "Kit Ampoules LED Phares H7", price: "3900", icon: "💡" },
      { title: "Compresseur d'Air Numérique 12V", price: "5800", icon: "🛞" },
      { title: "Dashcam Caméra Embarquée HD", price: "7500", icon: "📹" },
    ],
  },
  {
    id: "autre",
    name: "Autre / Général",
    icon: "🛍️",
    defaultDescription: "Sélection d'articles de qualité livrés chez vous dans les 58 wilayas.",
    suggestedProducts: [
      { title: "Article Vedette Premium", price: "3900", icon: "⭐" },
      { title: "Pack Duo Économique", price: "6500", icon: "🎁" },
      { title: "Essentiel Quotidien Pro", price: "2800", icon: "📦" },
    ],
  },
];

export function getNicheByName(name: string): NicheInfo {
  const found = NICHES.find((n) => n.name === name);
  if (found) return found;
  return NICHES[0] as NicheInfo;
}
