"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  X, 
  Check, 
  ArrowRight, 
  ArrowLeft,
  Plus, 
  Trash2, 
  Rocket, 
  Sparkles, 
  Store, 
  Loader2,
  Eye,
  Smartphone,
  Monitor,
  Upload,
  Phone,
  Tag,
  Palette,
  ShoppingBag,
  Layers
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { storesApi, productsApi, uploadApi, deployApi } from "@/lib/api";
import { slugify } from "@/lib/utils";
import { NICHES, getNicheByName } from "@/lib/niche-defaults";

interface DraftProduct {
  id: string;
  title: string;
  price: string;
  icon: string;
}

const COLOR_SWATCHES = [
  "#2540ea",
  "#ffd400",
  "#2c3b7d",
  "#4e6b39",
  "#c6a76a",
  "#e07b2a",
  "#b3593a",
  "#059669",
  "#e11d48",
  "#000000",
];

interface StoreTemplate {
  id: string;
  name: string;
  subtitle: string;
  type: "store" | "landing";
  badge: string;
  description: string;
  tag: string;
  features: string[];
  gradient: string;
  previewUrl: string;
  previewSvg: string;
  color: string;
}

const STORE_TEMPLATES: StoreTemplate[] = [
  {
    id: "neo-brutalist",
    name: "Neo-Brutalist (Audacieux & Fort)",
    subtitle: "Contours noirs épais, jaune vif & typographie percutante",
    type: "store",
    badge: "Impact Visuel Fort",
    description: "Design néo-brutaliste très affirmé avec bordures nettes et contrastes vifs. Idéal pour attirer immédiatement l'attention.",
    tag: "Audacieux & Moderne",
    features: ["Bordures épaisses & ombres nettes", "Design haute conversion", "Bandeau réassurance COD", "Panier 58 wilayas"],
    gradient: "from-yellow-400 to-amber-500",
    previewUrl: "/store-templates/06-neo-brutalist/template.html",
    previewSvg: "/store-templates/06-neo-brutalist/preview.svg",
    color: "#ffd400",
  },
  {
    id: "tuareg-indigo",
    name: "Tinariwen (Indigo & Terroir)",
    subtitle: "Bleu nuit indigo, dorures chaudes & tradition noble",
    type: "store",
    badge: "Saharien & Artisanal",
    description: "Inspiré de l'artisanat saharien et des matières nobles. Esthétique chaleureuse aux dorures subtiles.",
    tag: "Authentique & Terroir",
    features: ["Couleurs nobles & dorures", "Esthétique artisanale", "Filtres catégories", "Commande rapide COD"],
    gradient: "from-indigo-800 to-blue-950",
    previewUrl: "/store-templates/07-tuareg-indigo/template.html",
    previewSvg: "/store-templates/07-tuareg-indigo/preview.svg",
    color: "#2c3b7d",
  },
  {
    id: "energetic",
    name: "Pulse (Énergie & Mouvement)",
    subtitle: "Bleu électrique, néon dynamique & style sportif",
    type: "store",
    badge: "Sport & Performance",
    description: "Look technologique ultra-dynamique avec typographie sportive et badges biseautés.",
    tag: "Dynamique & Athlétique",
    features: ["Style athlétique affirmé", "Contrastes vifs & dynamiques", "Aperçu produits express", "Paiement à la livraison"],
    gradient: "from-blue-600 to-indigo-700",
    previewUrl: "/store-templates/08-energetic/template.html",
    previewSvg: "/store-templates/08-energetic/preview.svg",
    color: "#2f4dff",
  },
  {
    id: "natural",
    name: "Terre DZ (Naturel & Bio)",
    subtitle: "Vert olive doux, tons pierre & douceur organique",
    type: "store",
    badge: "Bio & Éco-responsable",
    description: "Ambiance douce et végétale avec formes organiques et typographie chaleureuse.",
    tag: "Naturel & Terroir",
    features: ["Atmosphère sereine et naturelle", "Design épuré et chaleureux", "Mise en avant qualité", "Commande facile"],
    gradient: "from-emerald-700 to-green-800",
    previewUrl: "/store-templates/09-natural/template.html",
    previewSvg: "/store-templates/09-natural/preview.svg",
    color: "#4e6b39",
  },
  {
    id: "luxe-noir",
    name: "Maison Noir (Luxe & Prestige)",
    subtitle: "Fond noir profond, dorures discrètes & magazine",
    type: "store",
    badge: "Haute Couture & Prestige",
    description: "Ambiance nocturne haut de gamme avec typographie serif raffinée et accents dorés précieux.",
    tag: "Luxe & Prestige",
    features: ["Ambiance nocturne prestige", "Finitions dorées élégantes", "Cartes produits minimalistes", "Checkout discret"],
    gradient: "from-zinc-900 to-neutral-950",
    previewUrl: "/store-templates/10-luxe-noir/template.html",
    previewSvg: "/store-templates/10-luxe-noir/preview.svg",
    color: "#c6a76a",
  },
  {
    id: "pantry-basics",
    name: "Pantry (Basics & Essentiels)",
    subtitle: "Orange solaire, bordures nettes & bundles",
    type: "store",
    badge: "Populaire & Énergique",
    description: "Design chaleureux et percutant. Parfait pour les articles quotidiens et les packs promotionnels.",
    tag: "Moderne & Accessible",
    features: ["Bordures nettes & chaleureux", "Bandeau défilant promo", "Panier tiroir interactif", "Avis clients vérifiés"],
    gradient: "from-amber-500 to-orange-600",
    previewUrl: "/store-templates/01-pantry-basics/template.html",
    previewSvg: "/store-templates/01-pantry-basics/preview.svg",
    color: "#e07b2a",
  },
  {
    id: "habitat-occasions",
    name: "Habitat (Élégant & Structuré)",
    subtitle: "Terre cuite, navigation par moments de vie",
    type: "store",
    badge: "Stylé & Épuré",
    description: "Mise en page soignée et épurée axée sur la mise en valeur des produits et la clarté.",
    tag: "Élégant & Structuré",
    features: ["Tri par thématique", "Fiche produit soignée", "Garantie qualité", "Paiement à la livraison"],
    gradient: "from-stone-600 to-amber-800",
    previewUrl: "/store-templates/02-habitat-occasions/template.html",
    previewSvg: "/store-templates/02-habitat-occasions/preview.svg",
    color: "#b3593a",
  },
  {
    id: "botanica-organic",
    name: "Botanica (Végétal & Pur)",
    subtitle: "Vert sauge, matières pures & fraîcheur",
    type: "store",
    badge: "Végétal & Apaisant",
    description: "Atmosphère claire et lumineuse, idéale pour mettre en avant la fraîcheur et la qualité des produits.",
    tag: "Frais & Lumineux",
    features: ["Badges qualité certifiée", "Indicateurs de transparence", "Design apaisant vert sauge", "Panier rapide"],
    gradient: "from-emerald-600 to-green-700",
    previewUrl: "/store-templates/03-botanica-organic/template.html",
    previewSvg: "/store-templates/03-botanica-organic/preview.svg",
    color: "#3d5c3a",
  },
  {
    id: "circuit-performance",
    name: "Circuit (Technique & Dynamique)",
    subtitle: "Bleu roi, fiches techniques & réassurance",
    type: "store",
    badge: "Technique & Moderne",
    description: "Esthétique technique épurée avec blocs d'avantages réassurance et commandes en un clic.",
    tag: "Technologique & Pro",
    features: ["Bandeau d'avantages réassurance", "Spécifications techniques", "Boutons d'ajout directs", "Style dynamique"],
    gradient: "from-blue-600 to-indigo-700",
    previewUrl: "/store-templates/04-circuit-performance/template.html",
    previewSvg: "/store-templates/04-circuit-performance/preview.svg",
    color: "#2563eb",
  },
  {
    id: "atelier-editorial",
    name: "Atelier (Éditorial & Chic)",
    subtitle: "Typographie noble, dorures & prestige",
    type: "store",
    badge: "Magazine & Édition",
    description: "Mise en page magazine élégante avec dorures discrètes et typographie noble.",
    tag: "Éditorial & Création",
    features: ["Esthétique magazine chic", "Éditions limitées", "Mise en page épurée", "Panier discret"],
    gradient: "from-amber-600 to-yellow-800",
    previewUrl: "/store-templates/05-atelier-editorial/template.html",
    previewSvg: "/store-templates/05-atelier-editorial/preview.svg",
    color: "#a08b4f",
  },
];

const STEPS = [
  { id: 1, title: "Boutique", icon: Store, desc: "Infos, contact & logo" },
  { id: 2, title: "Style", icon: Eye, desc: "Choix du modèle" },
  { id: 3, title: "Produits", icon: Plus, desc: "Vos premiers articles" },
  { id: 4, title: "Vérification", icon: Rocket, desc: "Récapitulatif & déploiement" },
];

export default function CreateStorePage() {
  const router = useRouter();
  const { user } = useAuth();

  // Wizard Step: 1 to 4
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Store info + Contact + Logo + Niche
  const [storeName, setStoreName] = useState("FitDZ Pro");
  const [category, setCategory] = useState("Sport & Musculation");
  const [description, setDescription] = useState(
    "Équipements de sport, haltères et tenues d'entraînement haute performance."
  );
  const [phone, setPhone] = useState("0550 12 34 56");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 2: Store Style (Theme / Template + Colors)
  const [selectedTheme, setSelectedTheme] = useState("neo-brutalist");
  const [selectedColor, setSelectedColor] = useState("#ffd400");
  const [selectedFont, setSelectedFont] = useState("Space Mono");
  const [selectedAnim, setSelectedAnim] = useState("Douce");
  const [templateFilter, setTemplateFilter] = useState<"all" | "store" | "landing">("all");
  const [previewModalTemplate, setPreviewModalTemplate] = useState<StoreTemplate | null>(null);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Step 3: Products
  const [products, setProducts] = useState<DraftProduct[]>([
    { id: "p-1", title: "Haltères Réglables Pro 20kg", price: "14500", icon: "🏋️" },
    { id: "p-2", title: "Ceinture de Force Cuir", price: "5800", icon: "🥊" },
  ]);

  // Product modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [prodModalTitle, setProdModalTitle] = useState("");
  const [prodModalPrice, setProdModalPrice] = useState("");
  const [prodModalIcon, setProdModalIcon] = useState("💪");

  // Generation loading state
  const [isGenerating, setIsGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [activeGenStep, setActiveGenStep] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Niche change handler
  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory);
    const nicheInfo = getNicheByName(newCategory);
    if (nicheInfo) {
      setDescription(nicheInfo.defaultDescription);
      setProdModalIcon(nicheInfo.icon);
      // Auto-suggest first 2 products if user hasn't added many
      if (products.length <= 2 && nicheInfo.suggestedProducts.length >= 2) {
        setProducts(
          nicheInfo.suggestedProducts.slice(0, 2).map((sp, idx) => ({
            id: `p-${idx + 1}`,
            title: sp.title,
            price: sp.price,
            icon: sp.icon,
          }))
        );
      }
    }
  };

  // Logo upload handler
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Le logo ne doit pas dépasser 5 Mo.");
        return;
      }
      setLogoFile(file);
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      toast.success("Logo ajouté avec succès !");
    }
  };

  // Add suggested product in 1 click
  const addSuggestedProduct = (title: string, price: string, icon: string) => {
    const newProd: DraftProduct = {
      id: `p-${Date.now()}`,
      title,
      price,
      icon,
    };
    setProducts((prev) => [...prev, newProd]);
    toast.success(`"${title}" ajouté aux produits !`);
  };

  // Add custom product from modal
  const handleSaveProductModal = () => {
    if (!prodModalTitle.trim()) {
      toast.error("Veuillez indiquer le nom de l'article.");
      return;
    }
    const newProd: DraftProduct = {
      id: `p-${Date.now()}`,
      title: prodModalTitle.trim(),
      price: prodModalPrice.trim() || "2500",
      icon: prodModalIcon || "🛍️",
    };
    setProducts((prev) => [...prev, newProd]);
    setIsProductModalOpen(false);
    setProdModalTitle("");
    setProdModalPrice("");
    toast.success("Article ajouté avec succès !");
  };

  // Delete product
  const handleDeleteProduct = (id: string) => {
    if (products.length <= 1) {
      toast.error("Votre boutique doit contenir au moins un produit.");
      return;
    }
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  // Start Generation & Deployment
  const startAiGeneration = async () => {
    setIsGenerating(true);
    setGenProgress(10);
    setActiveGenStep(1);

    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);

    try {
      // Step 1: Slug generation
      const baseSlug = slugify(storeName || "ma-boutique") || "store";
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const finalSlug = `${baseSlug}-${randomSuffix}`;

      setTimeout(() => {
        setGenProgress(35);
        setActiveGenStep(2);
      }, 1200);

      const animMap: Record<string, string> = {
        "Aucune": "none",
        "Douce": "soft",
        "Dynamique": "dynamic",
        "Spectaculaire": "spectacular",
      };
      const animStyle = animMap[selectedAnim] || "soft";

      // Step 2: Create store in database
      const createdStore = await storesApi.create({
        name: storeName.trim(),
        slug: finalSlug,
        description: description.trim(),
        category,
        whatsapp_phone: phone.trim(),
        primary_color: selectedColor,
        font_family: selectedFont,
        theme: selectedTheme,
        template_id: selectedTheme,
        animation_style: animStyle,
      });

      if (!createdStore?.id) {
        throw new Error("Erreur : la boutique n'a pas pu être enregistrée.");
      }

      // Enregistre immédiatement l'ID de la nouvelle boutique dans le navigateur
      if (typeof window !== "undefined") {
        localStorage.setItem("active_store_id", createdStore.id);
        window.dispatchEvent(new CustomEvent("active_store_changed", { detail: createdStore.id }));
      }

      setTimeout(() => {
        setGenProgress(50);
        setActiveGenStep(2);
      }, 800);

      // Upload logo if provided
      if (logoFile && createdStore?.id) {
        try {
          await uploadApi.image(logoFile, createdStore.id);
        } catch (uploadErr) {
          console.warn("Could not upload logo:", uploadErr);
        }
      }

      // Step 3: Insert products in database
      if (createdStore?.id && products.length > 0) {
        await Promise.all(
          products.map(async (p, idx) => {
            return productsApi.create({
              store_id: createdStore.id,
              name: p.title,
              title: p.title,
              price: parseFloat(p.price) || 2500,
              description: `Article officiel de la boutique ${storeName}`,
              category: category,
              position: idx,
              stock_quantity: 50,
              inventory_quantity: 50,
              status: "active",
            });
          })
        );
      }

      setTimeout(() => {
        setGenProgress(75);
        setActiveGenStep(3);
      }, 1800);

      // Step 4: Trigger Vercel & GitHub deployment
      try {
        await deployApi.deploy(createdStore.id);
      } catch (deployErr) {
        console.warn("Déploiement en cours :", deployErr);
      }

      setTimeout(() => {
        setGenProgress(95);
        setActiveGenStep(4);
      }, 2800);

      // Final step: Success & redirect with clean reload
      setTimeout(() => {
        setGenProgress(100);
        clearInterval(timer);
        toast.success(`Félicitations ! La boutique "${storeName}" est créée et son déploiement est lancé !`);
        window.location.href = `/dashboard?store_id=${createdStore.id}&new=1`;
      }, 3800);
    } catch (err: any) {
      console.error(err);
      clearInterval(timer);
      setIsGenerating(false);
      toast.error("Une erreur est survenue lors de la création de la boutique. Veuillez réessayer.");
    }
  };

  // Selected template object
  const currentTemplateObj = STORE_TEMPLATES.find((t) => t.id === selectedTheme) || STORE_TEMPLATES[0];
  const currentNicheInfo = getNicheByName(category);

  return (
    <div className="min-h-full w-full flex flex-col items-center justify-start py-4 sm:py-8 relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rocketPulse {
          0%, 100% { transform: translateY(0) scale(1); filter: drop-shadow(0 0 18px rgba(37,64,234,0.6)); }
          50% { transform: translateY(-8px) scale(1.05); filter: drop-shadow(0 0 35px rgba(56,189,248,0.9)); }
        }
        .animate-rocket { animation: rocketPulse 2.4s ease-in-out infinite; }
      ` }} />

      {isGenerating ? (
        /* ================================================================= */
        /* ECRAN DE GENERATION ET DEPLOIEMENT                               */
        /* ================================================================= */
        <div className="max-w-md w-full flex flex-col items-center text-center my-auto py-12 animate-in fade-in duration-300">
          <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 blur-2xl opacity-40 animate-pulse" />
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-500 border border-blue-300/40 flex items-center justify-center shadow-2xl relative z-10 animate-rocket">
              <Rocket className="w-12 h-12 text-white" />
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">
            Création de votre boutique en cours
          </h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xs leading-relaxed">
            Nous préparons votre boutique <span className="text-blue-400 font-bold">{storeName}</span> adaptée à votre domaine.
          </p>

          <div className="w-full max-w-xs mt-8">
            <div className="flex justify-between items-center text-xs font-bold text-slate-300 mb-2">
              <span>Progression</span>
              <span className="text-blue-400 font-mono">{genProgress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60 shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-teal-400 rounded-full transition-all duration-500 ease-out shadow-lg"
                style={{ width: `${genProgress}%` }}
              />
            </div>
          </div>

          <div className="w-full max-w-xs mt-6 flex flex-col gap-2.5 text-left text-xs text-slate-300">
            <div className={`flex items-center gap-2.5 p-2 rounded-lg border ${activeGenStep >= 1 ? "bg-blue-500/10 border-blue-500/30 text-blue-300 font-bold" : "border-slate-800 text-slate-500"}`}>
              <Check className={`w-4 h-4 ${activeGenStep >= 1 ? "text-blue-400" : "text-slate-600"}`} />
              <span>1. Enregistrement de la boutique & nom</span>
            </div>
            <div className={`flex items-center gap-2.5 p-2 rounded-lg border ${activeGenStep >= 2 ? "bg-blue-500/10 border-blue-500/30 text-blue-300 font-bold" : "border-slate-800 text-slate-500"}`}>
              <Check className={`w-4 h-4 ${activeGenStep >= 2 ? "text-blue-400" : "text-slate-600"}`} />
              <span>2. Application du style et adaptation à la niche</span>
            </div>
            <div className={`flex items-center gap-2.5 p-2 rounded-lg border ${activeGenStep >= 3 ? "bg-blue-500/10 border-blue-500/30 text-blue-300 font-bold" : "border-slate-800 text-slate-500"}`}>
              <Check className={`w-4 h-4 ${activeGenStep >= 3 ? "text-blue-400" : "text-slate-600"}`} />
              <span>3. Ajout de vos {products.length} articles</span>
            </div>
            <div className={`flex items-center gap-2.5 p-2 rounded-lg border ${activeGenStep >= 4 ? "bg-blue-500/10 border-blue-500/30 text-blue-300 font-bold" : "border-slate-800 text-slate-500"}`}>
              <Check className={`w-4 h-4 ${activeGenStep >= 4 ? "text-blue-400" : "text-slate-600"}`} />
              <span>4. Déploiement en ligne et panier COD</span>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-[11px] text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
            <span>Temps écoulé : {elapsedSeconds}s</span>
          </div>
        </div>
      ) : (
        /* ================================================================= */
        /* WIZARD PRINCIPAL EN 4 ETAPES                                      */
        /* ================================================================= */
        <div className="w-full max-w-4xl flex flex-col gap-6 px-4">
          
          {/* BARRE D'ETAPES (1 A 4) */}
          <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              {STEPS.map((s) => {
                const IconComponent = s.icon;
                const isActive = currentStep === s.id;
                const isPassed = currentStep > s.id;

                return (
                  <button
                    key={s.id}
                    onClick={() => {
                      if (s.id < currentStep) setCurrentStep(s.id);
                    }}
                    disabled={s.id > currentStep}
                    className={`flex-1 flex items-center justify-center sm:justify-start gap-2.5 p-2 sm:p-2.5 rounded-xl transition-all ${
                      isActive
                        ? "bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30"
                        : isPassed
                        ? "bg-slate-800/80 text-blue-400 hover:bg-slate-800 cursor-pointer"
                        : "text-slate-500 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${
                      isActive ? "bg-white text-blue-600" : isPassed ? "bg-blue-500/20 text-blue-400" : "bg-slate-800 text-slate-500"
                    }`}>
                      {isPassed ? <Check className="w-4 h-4" /> : s.id}
                    </div>
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="text-xs leading-none">{s.title}</span>
                      <span className="text-[10px] opacity-75 font-normal mt-0.5">{s.desc}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CONTENU DU FORMULAIRE */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 flex flex-col min-h-[500px]">
            
            {/* ── ETAPE 1 : INFORMATIONS DE LA BOUTIQUE ─────────────────── */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Store className="w-5 h-5 text-blue-600" />
                    Étape 1 — Informations de votre boutique
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Indiquez le nom de votre commerce, son domaine d&apos;activité, votre numéro pour les clients et votre logo.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Nom de la boutique */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Nom de la boutique <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Ex: FitDZ Pro, Maison Chic, Terroir Bio..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 font-semibold text-sm transition-all"
                    />
                    <span className="text-[11px] text-slate-400">
                      Ce nom apparaîtra en haut de votre boutique et dans les messages clients.
                    </span>
                  </div>

                  {/* Niche / Catégorie commerciale */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-blue-600" />
                      Domaine d&apos;activité / Niche <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={category}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 font-semibold text-sm transition-all bg-white cursor-pointer"
                    >
                      {NICHES.map((n) => (
                        <option key={n.id} value={n.name}>
                          {n.icon} {n.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-blue-600 font-semibold">
                      ⭐ Votre boutique adaptera automatiquement ses textes, badges et exemples à ce domaine.
                    </span>
                  </div>

                  {/* Numéro de téléphone */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      Téléphone pour les clients <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: 0550 12 34 56"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 font-semibold text-sm transition-all"
                    />
                    <span className="text-[11px] text-slate-400">
                      Utilisé pour recevoir les commandes WhatsApp et rassurer vos acheteurs.
                    </span>
                  </div>

                  {/* Logo de la boutique */}
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5 text-blue-600" />
                      Logo de la boutique (Optionnel)
                    </label>
                    <div className="flex items-center gap-4 p-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-all">
                      <div className="w-14 h-14 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl font-black text-blue-600">
                            {storeName ? storeName.charAt(0).toUpperCase() : "B"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col flex-1">
                        <input
                          type="file"
                          ref={logoInputRef}
                          onChange={handleLogoChange}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 text-left cursor-pointer"
                        >
                          {logoPreview ? "Changer le logo" : "Choisir une image (PNG, JPG, SVG)"}
                        </button>
                        <span className="text-[10px] text-slate-400 mt-0.5">
                          {logoFile ? logoFile.name : "Recommandé : image carrée max 5 Mo"}
                        </span>
                      </div>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description de la boutique */}
                <div className="flex flex-col gap-2 mt-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Description de la boutique
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Décrivez votre boutique en quelques mots..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 text-sm transition-all"
                  />
                  <span className="text-[11px] text-slate-400">
                    Cette description sera visible dans le pied de page et sur la bannière de bienvenue.
                  </span>
                </div>
              </div>
            )}

            {/* ── ETAPE 2 : CHOIX DU STYLE DE BOUTIQUE ─────────────────── */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <Eye className="w-5 h-5 text-blue-600" />
                      Étape 2 — Choix du style de boutique
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Choisissez le design visuel qui vous plaît le plus. Tous nos modèles s&apos;adaptent automatiquement à votre domaine ({category}).
                    </p>
                  </div>
                </div>

                {/* Grille des 10 templates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
                  {STORE_TEMPLATES.map((tpl) => {
                    const isSelected = selectedTheme === tpl.id;

                    return (
                      <div
                        key={tpl.id}
                        onClick={() => {
                          setSelectedTheme(tpl.id);
                          setSelectedColor(tpl.color);
                        }}
                        className={`relative flex flex-col p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/20 shadow-md ring-2 ring-blue-600/10"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                        }`}
                      >
                        {/* Header carte */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900 text-sm">{tpl.name}</span>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                                {tpl.badge}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                              {tpl.description}
                            </p>
                          </div>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isSelected ? "bg-blue-600 text-white" : "border-2 border-slate-300"
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>

                        {/* Aperçu Miniature SVG */}
                        <div className="w-full h-32 rounded-xl bg-slate-100 overflow-hidden border border-slate-200/80 my-2 relative group">
                          <img
                            src={tpl.previewSvg}
                            alt={tpl.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewModalTemplate(tpl);
                            }}
                            className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold"
                          >
                            <Eye className="w-4 h-4" />
                            Aperçu en direct
                          </button>
                        </div>

                        {/* Points forts */}
                        <div className="flex flex-wrap gap-1.5 mt-auto pt-2 border-t border-slate-100">
                          {tpl.features.slice(0, 3).map((f, i) => (
                            <span key={i} className="text-[10px] font-medium text-slate-600 bg-slate-100/80 px-2 py-0.5 rounded-md">
                              ✓ {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Personnalisation optionnelle couleur */}
                <div className="mt-2 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shadow-sm">
                      <Palette className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Couleur principale du style</span>
                      <span className="text-[11px] text-slate-500">Utilisée pour les boutons d&apos;action et les bannières</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {COLOR_SWATCHES.map((hex) => (
                      <button
                        key={hex}
                        type="button"
                        onClick={() => setSelectedColor(hex)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          selectedColor === hex ? "scale-125 border-slate-900 shadow-md" : "border-white hover:scale-110"
                        }`}
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ETAPE 3 : AJOUT DES PRODUITS ─────────────────────────── */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-blue-600" />
                      Étape 3 — Vos premiers produits
                    </h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Ajoutez les premiers articles que vos clients pourront commander. Suggestions adaptées à : <span className="font-bold text-blue-600">{category}</span>.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setProdModalTitle("");
                      setProdModalPrice("2500");
                      setProdModalIcon(currentNicheInfo.icon);
                      setIsProductModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md hover:bg-blue-700 transition-all cursor-pointer flex-shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un produit
                  </button>
                </div>

                {/* Suggestions 1-clic basées sur la niche */}
                {currentNicheInfo.suggestedProducts.length > 0 && (
                  <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 flex flex-col gap-2">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                      Suggestions rapides pour {category} (cliquez pour ajouter) :
                    </span>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {currentNicheInfo.suggestedProducts.map((sp, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => addSuggestedProduct(sp.title, sp.price, sp.icon)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-xs font-medium text-slate-800 hover:border-blue-400 hover:bg-blue-50 transition-all shadow-sm cursor-pointer"
                        >
                          <span>{sp.icon}</span>
                          <span className="font-bold">{sp.title}</span>
                          <span className="text-blue-600 font-bold ml-1">{sp.price} DA</span>
                          <Plus className="w-3 h-3 text-slate-400 ml-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Liste des produits actuels */}
                <div className="flex flex-col gap-2.5">
                  <div className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Articles enregistrés ({products.length})
                  </div>
                  <div className="flex flex-col gap-2">
                    {products.map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl flex-shrink-0">
                            {p.icon || "🛍️"}
                          </div>
                          <div>
                            <span className="text-sm font-bold text-slate-900 block">{p.title}</span>
                            <span className="text-xs text-blue-600 font-extrabold">{p.price} DA</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all"
                            title="Supprimer ce produit"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── ETAPE 4 : VERIFICATION ET DEPLOIEMENT ─────────────────── */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-6 animate-in fade-in duration-200">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-blue-600" />
                    Étape 4 — Vérification & Lancement
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Vérifiez le récapitulatif de votre boutique avant de lancer la création en un clic.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Récapitulatif 1: Boutique */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Boutique</span>
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(1)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl font-black text-blue-600 overflow-hidden shadow-sm flex-shrink-0">
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                        ) : (
                          storeName.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <span className="font-extrabold text-slate-900 text-sm block">{storeName}</span>
                        <span className="text-xs font-semibold text-blue-600 block">{category}</span>
                        <span className="text-[11px] text-slate-500 block">📞 {phone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif 2: Style */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Style</span>
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(2)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">{currentTemplateObj?.name || "Modèle"}</span>
                      <span className="text-xs text-slate-500 block mt-0.5">{currentTemplateObj?.badge || "Style"}</span>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-slate-600 font-medium">Couleur :</span>
                        <span 
                          className="w-4 h-4 rounded-full border border-slate-300 inline-block"
                          style={{ backgroundColor: selectedColor }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Récapitulatif 3: Produits */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Articles</span>
                      <button 
                        type="button" 
                        onClick={() => setCurrentStep(3)}
                        className="text-xs font-bold text-blue-600 hover:underline"
                      >
                        Modifier
                      </button>
                    </div>
                    <div>
                      <span className="font-extrabold text-slate-900 text-sm block">
                        {products.length} produit{products.length > 1 ? "s" : ""} enregistré{products.length > 1 ? "s" : ""}
                      </span>
                      <div className="flex flex-col gap-1 mt-1 text-xs text-slate-600 max-h-16 overflow-y-auto">
                        {products.slice(0, 3).map((p) => (
                          <div key={p.id} className="flex justify-between">
                            <span className="truncate pr-1">{p.icon} {p.title}</span>
                            <span className="font-bold text-slate-800">{p.price} DA</span>
                          </div>
                        ))}
                        {products.length > 3 && (
                          <span className="text-[10px] text-slate-400 font-semibold">
                            + {products.length - 3} autre(s)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bandeau confirmation */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">Tout est prêt pour le décollage ! 🚀</h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      En cliquant sur le bouton, votre boutique sera déployée avec son panier paiement à la livraison (58 wilayas).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startAiGeneration}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-all cursor-pointer flex-shrink-0"
                  >
                    <Rocket className="w-5 h-5" />
                    Lancer ma boutique maintenant
                  </button>
                </div>
              </div>
            )}

            {/* ── BARRE DE NAVIGATION EN BAS ──────────────────────────── */}
            <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((s) => Math.max(1, s - 1))}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Étape précédente
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  className="text-xs font-bold text-slate-400 hover:text-slate-600"
                >
                  Annuler
                </Link>
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1) {
                      if (!storeName.trim()) {
                        toast.error("Veuillez indiquer le nom de votre boutique.");
                        return;
                      }
                      if (!phone.trim()) {
                        toast.error("Veuillez indiquer votre numéro de téléphone client.");
                        return;
                      }
                    }
                    if (currentStep === 3 && products.length === 0) {
                      toast.error("Veuillez ajouter au moins un produit.");
                      return;
                    }
                    setCurrentStep((s) => Math.min(4, s + 1));
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all cursor-pointer"
                >
                  <span>Continuer vers l&apos;étape {currentStep + 1}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startAiGeneration}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-blue-600/30 hover:from-blue-700 hover:to-indigo-700 transition-all cursor-pointer"
                >
                  <Rocket className="w-4 h-4" />
                  <span>Déployer ma boutique</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── MODAL D'AJOUT DE PRODUIT ──────────────────────────────────── */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-extrabold text-slate-900 text-base">Ajouter un produit</h4>
              <button 
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Nom du produit *</label>
                <input
                  type="text"
                  value={prodModalTitle}
                  onChange={(e) => setProdModalTitle(e.target.value)}
                  placeholder="Ex: T-Shirt Premium, Whey 1kg..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Prix (DA) *</label>
                <input
                  type="number"
                  value={prodModalPrice}
                  onChange={(e) => setProdModalPrice(e.target.value)}
                  placeholder="2500"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-xs font-semibold outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Icône / Emoji</label>
                <input
                  type="text"
                  value={prodModalIcon}
                  onChange={(e) => setProdModalIcon(e.target.value)}
                  placeholder="👕"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 text-center text-lg outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSaveProductModal}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md"
              >
                Ajouter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL D'APERÇU EN DIRECT DU TEMPLATE ──────────────────────── */}
      {previewModalTemplate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-2 sm:p-6 animate-in fade-in">
          <div className="w-full max-w-5xl h-full max-h-[90vh] bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 flex flex-col shadow-2xl">
            {/* Header modal */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between text-white">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-sm">{previewModalTemplate.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">
                  {previewModalTemplate.badge}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("desktop")}
                    className={`p-1.5 rounded-md text-xs ${previewDevice === "desktop" ? "bg-blue-600 text-white" : "text-slate-400"}`}
                    title="Ordinateur"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice("mobile")}
                    className={`p-1.5 rounded-md text-xs ${previewDevice === "mobile" ? "bg-blue-600 text-white" : "text-slate-400"}`}
                    title="Mobile"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalTemplate(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Iframe preview */}
            <div className="flex-1 bg-slate-950 flex items-center justify-center p-2 overflow-hidden">
              <div className={`h-full transition-all duration-300 bg-white rounded-2xl overflow-hidden shadow-2xl ${
                previewDevice === "mobile" ? "w-[390px]" : "w-full"
              }`}>
                <iframe
                  src={previewModalTemplate.previewUrl}
                  className="w-full h-full border-0"
                  title={previewModalTemplate.name}
                />
              </div>
            </div>

            {/* Footer modal */}
            <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 px-6">
              <span>Aperçu interactif</span>
              <button
                type="button"
                onClick={() => {
                  setSelectedTheme(previewModalTemplate.id);
                  setSelectedColor(previewModalTemplate.color);
                  setPreviewModalTemplate(null);
                  toast.success(`Modèle "${previewModalTemplate.name}" sélectionné !`);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md"
              >
                Choisir ce modèle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
