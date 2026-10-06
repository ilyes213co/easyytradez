"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, ChevronRight, Check, Trash2, 
  ImagePlus, Store, Package,
  Loader2, Sparkles, X,
  RefreshCw, Rocket, Plus, Wand2,
  Layers, Phone, FileText, CheckCircle2,
  DollarSign, Star
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { cn, slugify, formatPrice } from "@/lib/utils";
import { storesApi, uploadApi, deployApi } from "@/lib/api";
import { STORE_AND_FUNNEL_TEMPLATES, getTemplatesForScope, type TemplateData } from "@/lib/templates/data";
import type { Store as StoreType, Product } from "@/types/database";
import type { ProductOption, ProductOptionValue } from "@/types/product";

// ─── Constants & Types ────────────────────────────────────────────────────────

const CATEGORIES = [
  "Mode & Vêtements", "Électronique & Tech", "Maison & Décoration", 
  "Beauté & Soins", "Alimentation & Terroir", "Sport & Fitness", 
  "Jouets & Enfants", "Art & Bijoux", "Montres & Accessoires", "Autre"
];


export interface WizardImageItem {
  url: string;
  public_id?: string;
  file?: File;
}

type WizardProductDraft = Omit<Partial<Product>, "images"> & {
  images?: Array<string | WizardImageItem>;
  options?: ProductOption[];
  status?: string;
  compare_price?: number;
  benefits?: string[];
  pending_image_file?: File | null;
};

interface WizardState {
  name: string;
  category: string;
  description: string;
  whatsapp_phone: string;
  logo_url: string | null;
  logo_public_id: string | null;
  primary_color: string;
  theme: string;
  selected_template_id: string;
  funnel_mode: "ready_template" | "generate_with_pic";
  products: WizardProductDraft[];
}

const getInitialState = (type: "boutique" | "funnel"): WizardState => {
  const isFunnel = type === "funnel";
  const defaultTheme = isFunnel ? "crimson" : "monochrome";
  const defaultColor = isFunnel ? "#9c1220" : "#0d0d0d";
  return {
    name: "",
    category: CATEGORIES[0] || "Autre",
    description: "",
    whatsapp_phone: "",
    logo_url: null,
    logo_public_id: null,
    primary_color: defaultColor,
    theme: defaultTheme,
    selected_template_id: defaultTheme,
    funnel_mode: "ready_template",
    products: [],
  };
};

const isBlobUrl = (value: string | null | undefined) => Boolean(value?.startsWith("blob:"));

function serializeWizardDraft(state: WizardState) {
  return {
    ...state,
    logo_url: isBlobUrl(state.logo_url) ? null : state.logo_url,
    logo_public_id: state.logo_public_id?.startsWith("local:") ? null : state.logo_public_id,
    products: state.products.map(({ pending_image_file, ...product }) => ({
      ...product,
      images: (product.images ?? [])
        .map((img: any) => {
          if (typeof img === "string") return img;
          const { file, ...rest } = img || {};
          return rest;
        })
        .filter((image: any) => {
          const url = typeof image === "string" ? image : image?.url;
          const pid = typeof image === "object" ? image?.public_id : "";
          return url && !isBlobUrl(url) && !String(pid ?? "").startsWith("local:");
        }),
    })),
  };
}

const step1Schema = z.object({
  name: z.string().min(2, "Le nom doit comporter au moins 2 caractères").max(60),
  category: z.string().min(1, "Choisissez une catégorie"),
  description: z.string().max(300, "Description limitée à 300 caractères").optional(),
  whatsapp_phone: z.string().refine((val) => {
    const clean = val.replace(/\D/g, "");
    return clean.length >= 9 && clean.length <= 13;
  }, "Numéro de téléphone algérien valide requis (ex: 0550123456)"),
});

export interface CreateWizardProps {
  type: "boutique" | "funnel";
}

export default function CreateWizard({ type }: CreateWizardProps) {
  const router = useRouter();
  const isFunnel = type === "funnel";
  const DRAFT_KEY = `wizard_draft_${type}_v2`;
  const DEPLOY_KEY = `pending_deploy_${type}`;

  // Step definition: 3 Steps (1: Identité -> 2: Template -> 3: Produits -> Lancement)
  const totalSteps = 3;

  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardState>(() => getInitialState(type));
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [genMessage, setGenMessage] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pendingDeploy, setPendingDeploy] = useState<{ jobId: string; storeId: string } | null>(null);
  const genTimerRef = useRef<number | null>(null);

  // Load draft
  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const availableTpls = getTemplatesForScope(type);
        const validTheme = availableTpls.some((t) => t.id === parsed.theme)
          ? parsed.theme
          : availableTpls[0]?.id || (type === "funnel" ? "crimson" : "monochrome");
        const sanitized = serializeWizardDraft({
          ...getInitialState(type),
          ...parsed,
          theme: validTheme,
          selected_template_id: validTheme,
          products: parsed.products ?? [],
        } as WizardState);
        setData((prev) => ({ ...prev, ...sanitized }));
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, [DRAFT_KEY, type]);

  // Check pending deploy
  useEffect(() => {
    const raw = localStorage.getItem(DEPLOY_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.jobId && parsed?.storeId) {
        setPendingDeploy({ jobId: parsed.jobId, storeId: parsed.storeId });
      }
    } catch {
      localStorage.removeItem(DEPLOY_KEY);
    }
  }, [DEPLOY_KEY]);

  // Save draft
  useEffect(() => {
    if (!isGenerating) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(serializeWizardDraft(data)));
    }
  }, [data, step, isGenerating, DRAFT_KEY]);

  // Timer
  useEffect(() => {
    if (!isGenerating) {
      if (genTimerRef.current) window.clearInterval(genTimerRef.current);
      genTimerRef.current = null;
      setElapsedSec(0);
      return;
    }
    const startedAt = Date.now();
    genTimerRef.current = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => {
      if (genTimerRef.current) window.clearInterval(genTimerRef.current);
      genTimerRef.current = null;
    };
  }, [isGenerating]);

  const clearPendingDeploy = () => {
    localStorage.removeItem(DEPLOY_KEY);
    setPendingDeploy(null);
  };

  const handleNext = () => {
    if (step === 1) {
      const res = step1Schema.safeParse(data);
      if (!res.success) {
        const errs: Record<string, string> = {};
        res.error.errors.forEach((e) => {
          errs[e.path[0] as string] = e.message;
        });
        setErrors(errs);
        toast.error("Veuillez remplir correctement les champs obligatoires");
        return;
      }
      setErrors({});
    }

    // Step 3 : Validate products before launching
    if (step === 3) {
      const validProducts = data.products.filter((p) => p.name?.trim() && p.price && Number(p.price) >= 100);
      if (validProducts.length === 0) {
        toast.error(
          isFunnel
            ? "Ajoutez votre produit star avec un nom et un prix pour générer votre funnel."
            : "Ajoutez au moins un produit avec un nom et un prix pour générer votre boutique."
        );
        return;
      }
      handleGenerate();
      return;
    }

    setStep((s) => Math.min(s + 1, totalSteps));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const POLL_DEADLINE_MS = 5 * 60 * 1000;

  const pollDeployUntilReady = async (jobId: string, startedAt: number) => {
    let currentStatus = "pending";
    let finalUrl = "";
    while (Date.now() - startedAt < POLL_DEADLINE_MS) {
      await new Promise((r) => setTimeout(r, 2500));
      const statusRes = await deployApi.status(jobId);
      currentStatus = statusRes.status;
      if (currentStatus === "pending") {
        setGenStep(2);
        setGenMessage("Initialisation des serveurs haute performance...");
      }
      if (currentStatus === "generating") {
        setGenStep(3);
        setGenMessage("Génération du design optimisé pour la conversion en Algérie...");
      }
      if (currentStatus === "deploying") {
        setGenStep(4);
        setGenMessage("Publication en ligne sur le réseau haute vitesse...");
      }
      if (currentStatus === "error") {
        clearPendingDeploy();
        throw new Error(statusRes.error || "Échec du déploiement");
      }
      if (currentStatus === "ready") {
        finalUrl = statusRes.url || "";
        break;
      }
    }

    if (currentStatus !== "ready") {
      throw new Error("Le déploiement prend trop de temps.");
    }
    return finalUrl;
  };

  const handleGenerate = async () => {
    // Garde-fous validation produits obligatoires
    if (isFunnel) {
      const star = data.products[0];
      if (!star || !star.name?.trim() || !star.price || Number(star.price) < 100) {
        toast.error("Veuillez renseigner le nom et le prix (min. 100 DA) de votre produit star à l'étape 3.");
        setStep(3);
        return;
      }
    } else {
      const validProducts = data.products.filter((p) => p.name?.trim() && p.price && Number(p.price) >= 100);
      if (validProducts.length === 0) {
        toast.error("Veuillez ajouter au moins un produit avec nom et prix (min. 100 DA) à votre boutique.");
        setStep(3);
        return;
      }
    }

    setIsGenerating(true);
    setGenStep(1);
    setGenMessage(`Création de votre ${isFunnel ? "funnel mono-produit" : "boutique"}...`);

    const generatedSlug = slugify(data.name);
    const storePayload = {
      name: data.name,
      ...(generatedSlug.length >= 2 ? { slug: generatedSlug } : {}),
      description: data.description || undefined,
      whatsapp_phone: data.whatsapp_phone.replace(/\s+/g, ""),
      category: data.category || undefined,
      logo_url: isBlobUrl(data.logo_url) ? undefined : data.logo_url || undefined,
      primary_color: data.primary_color,
      theme: data.theme || data.selected_template_id || "crimson",
      type: type,
    };

    try {
      const store: StoreType = await storesApi.create(storePayload);

      // Logo upload if pending
      if (logoFile) {
        setGenMessage("Traitement du logo...");
        try {
          const logoRes = await uploadApi.logo(logoFile, store.id);
          if (logoRes?.url) {
            await storesApi.update(store.id, { logo_url: logoRes.url });
          }
        } catch (e) {
          console.warn("Logo upload failed non-blockingly", e);
        }
      }

      // Products registration (only if user provided a product in Funnel mode B)
      const productsToRegister = [...data.products];

      if (productsToRegister.length > 0) {
        setGenStep(2);
        setGenMessage(`Enregistrement du ${isFunnel ? "produit star" : "catalogue"}...`);
        const { productsApi } = await import("@/lib/api");

        for (const p of productsToRegister) {
          if (!p.name || !p.price) continue;
          let imageItems: Array<{ url: string; public_id: string }> = [];

          const rawImages = p.images && p.images.length > 0 ? p.images : [];

          if (rawImages.length > 0) {
            for (let i = 0; i < rawImages.length; i++) {
              const img: any = rawImages[i];
              const file: File | undefined = img?.file || (i === 0 && rawImages.length === 1 ? p.pending_image_file : undefined);
              if (file) {
                setGenMessage(`Upload de la photo ${i + 1}/${rawImages.length}...`);
                try {
                  const up = await uploadApi.image(file, store.id);
                  if (up?.url) {
                    imageItems.push({
                      url: up.url,
                      public_id: up.public_id || `prod_${Date.now()}_${i}`,
                    });
                  }
                } catch (e) {
                  console.warn(`Product image ${i + 1} upload warning:`, e);
                }
              } else if (typeof img === "string" && img && !isBlobUrl(img)) {
                imageItems.push({ url: img, public_id: `prod_${Date.now()}_${i}` });
              } else if (img?.url && !isBlobUrl(img.url)) {
                imageItems.push({
                  url: img.url,
                  public_id: img.public_id || `prod_${Date.now()}_${i}`,
                });
              }
            }
          } else if (p.pending_image_file) {
            try {
              const up = await uploadApi.image(p.pending_image_file, store.id);
              if (up?.url) {
                imageItems.push({
                  url: up.url,
                  public_id: up.public_id || `prod_${Date.now()}`,
                });
              }
            } catch (e) {
              console.warn("Product image upload warning:", e);
            }
          }

          const cleanedOptions = (p.options || [])
            .map((opt) => ({
              ...opt,
              name: (opt.name || "").trim(),
              values: (opt.values || [])
                .filter((v) => (v.label || "").trim().length > 0)
                .map((v) => ({ ...v, label: (v.label || "").trim() })),
            }))
            .filter((opt) => opt.name.length > 0 && opt.values.length > 0);

          try {
            await productsApi.create({
              store_id: store.id,
              name: p.name,
              price: Number(p.price),
              original_price: p.compare_price ? Number(p.compare_price) : undefined,
              description: p.description || "",
              images: imageItems,
              options: cleanedOptions,
              category: p.category || data.category || "Général",
            });
          } catch (e: any) {
            console.error("Product creation error:", e);
            const errDetail = e?.response?.data?.detail;
            toast.error(
              typeof errDetail === "string"
                ? `Erreur produit : ${errDetail}`
                : `Erreur lors de l'enregistrement de "${p.name}".`
            );
            throw e;
          }
        }
      }

      // Deploy
      setGenStep(3);
      setGenMessage("Lancement du déploiement optimisé...");
      const deployRes = await deployApi.deploy(store.id);
      const jobId = deployRes?.job_id;

      if (jobId) {
        localStorage.setItem(DEPLOY_KEY, JSON.stringify({ jobId, storeId: store.id }));
        setPendingDeploy({ jobId, storeId: store.id });
        await pollDeployUntilReady(jobId, Date.now());
      }

      clearPendingDeploy();
      localStorage.removeItem(DRAFT_KEY);
      toast.success(`${isFunnel ? "Funnel" : "Boutique"} créé(e) avec succès !`);
      router.push(`/dashboard/${type}/${store.id}`);
    } catch (err: any) {
      setIsGenerating(false);
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : err?.message ?? "Une erreur est survenue");
    }
  };

  const generatingSteps = [
    `Création de la base du ${isFunnel ? "funnel" : "store"}`,
    `Enregistrement du ${isFunnel ? "produit star" : "catalogue"}`,
    "Génération du design & de l'agencement",
    "Déploiement haute performance",
  ];

  const genProgress = Math.min(100, Math.round((genStep / generatingSteps.length) * 100));

  if (isGenerating) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="relative h-24 w-24 mx-auto">
            <div className="absolute inset-0 bg-[#2540ea]/20 rounded-full animate-ping" />
            <div className="relative bg-gradient-to-tr from-[#1a2ca3] to-[#2540ea] rounded-full h-24 w-24 flex items-center justify-center shadow-xl shadow-[#2540ea]/40">
              <Rocket className="w-10 h-10 text-white animate-bounce" />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">
              Création de votre {isFunnel ? "Funnel" : "Boutique"}
            </h2>
            <p className="text-white/60 text-sm mt-1">{genMessage || "Configuration en cours..."}</p>
            <p className="text-xs text-[#93c5fd] font-mono mt-2">Temps écoulé : {elapsedSec}s</p>
          </div>

          <div className="space-y-4 text-left">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#2540ea] to-[#60a5fa]"
                initial={{ width: 0 }}
                animate={{ width: `${genProgress}%` }}
              />
            </div>

            <div className="space-y-2.5">
              {generatingSteps.map((s, i) => {
                const isActive = i + 1 === genStep;
                const isDone = i + 1 < genStep;
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 transition-opacity ${
                      isActive ? "opacity-100" : isDone ? "opacity-90" : "opacity-35"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                        isDone
                          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-500/50"
                          : isActive
                          ? "bg-[#2540ea] text-white shadow-md shadow-[#2540ea]/50 animate-pulse"
                          : "bg-white/10 text-white/40"
                      }`}
                    >
                      {isDone ? <Check className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-xs font-semibold ${isActive ? "text-white" : "text-white/70"}`}>
                      {s}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 pb-32">
      {/* Top Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{isFunnel ? "🎯" : "🏬"}</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {isFunnel ? "Créer un Funnel de vente" : "Créer une Boutique multi-produits"}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-white/55 mt-1 font-medium">
              Étape {step} sur {totalSteps} — {
                step === 1
                  ? "Identité & Informations de base"
                  : step === 2
                  ? (isFunnel ? "Choix du design" : "Choix du modèle de boutique")
                  : (isFunnel ? "Votre produit star" : "Votre catalogue produits")
              }
            </p>
          </div>

          <button
            onClick={() => router.push(`/dashboard/${type}`)}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="Quitter"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step
                  ? "bg-gradient-to-r from-[#2540ea] to-[#60a5fa] shadow-sm shadow-[#2540ea]/50"
                  : "bg-white/10"
              }`}
            />
          ))}
        </div>
      </div>

      {pendingDeploy && (
        <div className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-white">
          <div>
            <p className="text-sm font-bold text-amber-300">Un déploiement est en cours</p>
            <p className="text-xs text-white/60">Job : {pendingDeploy.jobId.slice(0, 8)}...</p>
          </div>
          <button
            onClick={() => router.push(`/dashboard/${type}/${pendingDeploy.storeId}`)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Voir le statut
          </button>
        </div>
      )}

      {/* Main Glass Card */}
      <div
        className="rounded-[28px] p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-2xl transition-all"
        style={{
          background: "linear-gradient(155deg, rgba(20, 28, 75, 0.45) 0%, rgba(8, 11, 28, 0.95) 100%)",
          border: "1px solid rgba(96, 165, 250, 0.22)",
          boxShadow: "0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 35px rgba(37, 64, 234, 0.15)",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* STEP 1: Basic info with luxury/modern redesign */}
            {step === 1 && (
              <Step1Redesigned
                data={data}
                setData={setData}
                errors={errors}
                type={type}
                setLogoFile={setLogoFile}
              />
            )}

            {/* STEP 2: Funnel (Templates OR Product Landing Generator) / Store (Template Selection) */}
            {step === 2 && (
              <Step2TemplatesAndFunnel
                data={data}
                setData={setData}
                type={type}
              />
            )}

            {/* STEP 3: Produits / Catalogue — l'utilisateur saisit ses propres données */}
            {step === 3 && (
              <Step3ProductEntry
                data={data}
                setData={setData}
                type={type}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom Floating Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#06060f]/90 backdrop-blur-xl border-t border-white/10 p-4 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all ${
              step === 1 ? "opacity-0 pointer-events-none" : "text-white/60 hover:text-white hover:bg-white/[0.04]"
            }`}
          >
            <ChevronLeft className="w-4 h-4" /> Précédent
          </button>

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, #2540ea 0%, #1a2ca3 100%)",
                boxShadow: "0 8px 24px -4px rgba(37, 64, 234, 0.6)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <span>Continuer</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !!pendingDeploy}
              className="flex items-center gap-2 text-white px-9 py-3.5 rounded-xl font-bold text-sm shadow-xl transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #2540ea 0%, #1a2ca3 100%)",
                boxShadow: "0 8px 28px -4px rgba(37, 64, 234, 0.7)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <Sparkles className="w-4 h-4 text-[#93c5fd]" />
              <span>{pendingDeploy ? "Déploiement en cours" : isFunnel ? "Lancer mon Funnel" : "Lancer ma Boutique"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 : Informations & Identité de Marque (Design Haut de Gamme)
// ─────────────────────────────────────────────────────────────────────────────

function Step1Redesigned({
  data,
  setData,
  errors,
  type,
  setLogoFile,
}: {
  data: WizardState;
  setData: any;
  errors: any;
  type: "boutique" | "funnel";
  setLogoFile: (file: File | null) => void;
}) {
  const isFunnel = type === "funnel";

  const onDropLogo = (files: File[]) => {
    if (!files[0]) return;
    const file = files[0];
    const previewUrl = URL.createObjectURL(file);
    setLogoFile(file);
    setData((p: any) => ({ ...p, logo_url: previewUrl, logo_public_id: `local:${file.name}` }));
    toast.success("Logo chargé !");
  };

  const { getRootProps: getLogoRoot, getInputProps: getLogoInput, isDragActive: isLogoDrag } = useDropzone({
    onDrop: onDropLogo,
    accept: { "image/*": [] },
    multiple: false,
  });

  return (
    <div className="space-y-8">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Store className="w-6 h-6 text-[#93c5fd]" />
            <span>Identité & Informations</span>
          </h2>
          <p className="text-xs sm:text-sm text-white/55 mt-1">
            {isFunnel
              ? "Configurez les informations maîtresses de votre page de vente mono-produit."
              : "Renseignez le nom officiel, la catégorie et le contact de votre boutique."}
          </p>
        </div>
        <span className="self-start sm:self-center text-xs font-bold px-3 py-1 rounded-full bg-[#2540ea]/20 text-[#93c5fd] border border-[#2540ea]/40">
          {isFunnel ? "🎯 Mode Funnel" : "🏬 Mode Boutique"}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Form Fields */}
        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-white/90 flex items-center justify-between">
              <span>{isFunnel ? "Nom du funnel (Produit phare)" : "Nom de la boutique"}</span>
              <span className="text-[10px] text-white/40">Obligatoire</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder={isFunnel ? "Ex : Sérum Éclat Naturel" : "Ex : Dz Luxe Store"}
                value={data.name}
                onChange={(e) => setData((p: any) => ({ ...p, name: e.target.value }))}
                className={cn(
                  "w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border focus:outline-none transition-all",
                  errors.name ? "border-rose-500" : "border-white/15 focus:border-[#93c5fd]"
                )}
              />
            </div>
            {errors.name && <p className="text-xs text-rose-400 font-medium">{errors.name}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-white/90">Catégorie principale</label>
            <select
              value={data.category}
              onChange={(e) => setData((p: any) => ({ ...p, category: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl text-sm text-white bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none transition-all cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-[#0b0b14] text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* WhatsApp Phone */}
          <div className="space-y-1.5 text-left">
            <label className="text-xs font-bold text-white/90 flex items-center gap-1.5">
              <span>Numéro WhatsApp (Algérie 🇩🇿)</span>
            </label>
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="05 / 06 / 07 XX XX XX"
                value={data.whatsapp_phone}
                onChange={(e) => setData((p: any) => ({ ...p, whatsapp_phone: e.target.value }))}
                className={cn(
                  "w-full px-4 py-3 pl-11 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border focus:outline-none transition-all",
                  errors.whatsapp_phone ? "border-rose-500" : "border-white/15 focus:border-[#93c5fd]"
                )}
              />
              <Phone className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
            </div>
            <p className="text-[11px] text-white/45">
              Les notifications de commandes seront transmises directement vers ce numéro WhatsApp.
            </p>
            {errors.whatsapp_phone && (
              <p className="text-xs text-rose-400 font-medium">{errors.whatsapp_phone}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-white/90">
                {isFunnel ? "Accroche principale du funnel" : "Courte description"}
              </label>
              <span className="text-[10px] text-white/40">{data.description?.length || 0}/300</span>
            </div>
            <textarea
              rows={3}
              placeholder={
                isFunnel
                  ? "La promesse irrésistible de votre produit qui pousse à commander..."
                  : "Présentez brièvement vos collections et votre univers de marque..."
              }
              value={data.description}
              onChange={(e) => setData((p: any) => ({ ...p, description: e.target.value }))}
              maxLength={300}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Right Column: Visual Brand Identity (Logo + Color) */}
        <div className="space-y-5 flex flex-col justify-start">
          {/* Logo Dropzone */}
          <div className="space-y-1.5 text-left h-full flex flex-col">
            <label className="text-xs font-bold text-white/90 flex items-center justify-between">
              <span>Logo de la marque</span>
              <span className="text-[10px] text-white/40">Optionnel</span>
            </label>

            <div
              {...getLogoRoot()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-5 transition-all cursor-pointer flex flex-col items-center justify-center text-center relative overflow-hidden group flex-1 min-h-[190px]",
                isLogoDrag
                  ? "border-[#2540ea] bg-[#2540ea]/10"
                  : "border-white/15 hover:border-white/35 bg-white/[0.02]",
                data.logo_url && "border-[#2540ea]/40 bg-[#2540ea]/5"
              )}
            >
              <input {...getLogoInput()} />
              {data.logo_url ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="relative w-24 h-24 rounded-2xl bg-[#060612] p-2 border border-white/20 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={data.logo_url}
                      alt="Logo"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                  <p className="text-xs text-[#93c5fd] font-semibold flex items-center gap-1 group-hover:underline">
                    <RefreshCw className="w-3 h-3" /> Changer le logo
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#93c5fd] mb-2 group-hover:scale-105 transition-transform">
                    <ImagePlus className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-white">Déposer votre logo ici</p>
                  <p className="text-[11px] text-white/40 mt-0.5">PNG, JPG, SVG ou WebP</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 : Choix du Template OU Génération IA Photo Produit (Ayor)
// ─────────────────────────────────────────────────────────────────────────────

function Step2TemplatesAndFunnel({
  data,
  setData,
  type,
}: {
  data: WizardState;
  setData: any;
  type: "boutique" | "funnel";
}) {
  const isFunnel = type === "funnel";
  const availableTemplates = useMemo(() => {
    return getTemplatesForScope(isFunnel ? "funnel" : "boutique");
  }, [isFunnel]);

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 text-left">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#93c5fd]" />
            <span>{isFunnel ? "Modèle du Funnel & Produit" : "Choisissez votre Template de Boutique"}</span>
          </h2>
          <p className="text-xs sm:text-sm text-white/55 mt-1">
            {isFunnel
              ? "Thèmes calibrés pour la vente mono-produit et la conversion directe COD."
              : "Thèmes calibrés pour mettre en valeur un catalogue complet multi-produits."}
          </p>
        </div>
      </div>

      {/* If Funnel: Switcher between "Ready Templates" and "Generate with Product Pic" */}
      {isFunnel && (
        <div className="flex p-1 rounded-2xl bg-black/40 border border-white/15 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setData((p: any) => ({ ...p, funnel_mode: "ready_template" }))}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
              data.funnel_mode === "ready_template"
                ? "bg-[#2540ea] text-white shadow-lg shadow-[#2540ea]/50"
                : "text-white/60 hover:text-white"
            )}
          >
            <Layers className="w-4 h-4" />
            <span>Templates Prêts ({availableTemplates.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setData((p: any) => ({ ...p, funnel_mode: "generate_with_pic" }))}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2",
              data.funnel_mode === "generate_with_pic"
                ? "bg-[#2540ea] text-white shadow-lg shadow-[#2540ea]/50"
                : "text-white/60 hover:text-white"
            )}
          >
            <Wand2 className="w-4 h-4 text-[#93c5fd]" />
            <span>Avec Photo Produit (Ayor)</span>
          </button>
        </div>
      )}

      {/* SUB-VIEW 1: Ready Templates Grid (for both Store and Funnel Mode A) */}
      {(!isFunnel || data.funnel_mode === "ready_template") && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white/70">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8] shrink-0" />
            <span>
              {isFunnel
                ? "Thèmes calibrés Funnel (4) — Conçus pour les drops rapides, visuels immersifs et commande COD immédiate."
                : "Thèmes calibrés Boutique (6) — Conçus pour les catalogues multi-produits, la navigation par rayons et les paniers."}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
            {availableTemplates.map((tpl: TemplateData) => {
            const isSelected = data.theme === tpl.id;
            return (
              <div
                key={tpl.id}
                onClick={() => {
                  setData((p: any) => ({
                    ...p,
                    theme: tpl.id,
                    selected_template_id: tpl.id,
                    // Ne PAS pré-remplir les produits avec les données de démo du template.
                    // L'utilisateur saisira ses propres données à l'étape suivante.
                  }));
                }}
                className={cn(
                  "p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative flex flex-col justify-between group",
                  isSelected
                    ? "border-[#60a5fa] bg-gradient-to-b from-[#2540ea]/20 to-[#0e1338] shadow-xl shadow-[#2540ea]/30 ring-2 ring-[#2540ea]/60 scale-[1.01]"
                    : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
                )}
              >
                {/* Top Badge & Indicator */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className="text-[10px] font-bold px-2.5 py-1 rounded-md"
                    style={{
                      background: tpl.colors.accentSoft,
                      color: tpl.colors.text === "#000000" ? "#000" : tpl.colors.accent,
                      border: `1px solid ${tpl.colors.border}`,
                    }}
                  >
                    {tpl.badge}
                  </span>

                  <div
                    className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                      isSelected
                        ? "bg-[#2540ea] text-white shadow-sm shadow-[#2540ea]/60"
                        : "border border-white/20 text-transparent"
                    )}
                  >
                    <Check className="w-3 h-3" />
                  </div>
                </div>

                {/* Template Name & Category */}
                <div className="space-y-1 mb-3">
                  <h3 className="text-base font-extrabold text-white group-hover:text-[#93c5fd] transition-colors">
                    {tpl.name}
                  </h3>
                  <p className="text-xs text-white/50">{tpl.category}</p>
                </div>

                {/* Visual Preview Box */}
                <div
                  className="rounded-xl p-3 border mb-3 text-xs overflow-hidden"
                  style={{
                    backgroundColor: tpl.colors.bg,
                    borderColor: tpl.colors.border,
                    color: tpl.colors.text,
                  }}
                >
                  <p className="font-bold truncate text-[11px] opacity-90">{tpl.headline}</p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/10">
                    <span className="text-[10px] opacity-70">
                      {isFunnel ? tpl.demoProduct.name : tpl.sampleCategories.join(" · ")}
                    </span>
                    {isFunnel && (
                      <span className="font-extrabold text-[11px]" style={{ color: tpl.colors.accent }}>
                        {formatPrice(tpl.demoProduct.price)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Color swatches & font pill */}
                <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-white/40">
                  <span className="font-mono text-[10px] truncate">{tpl.fonts}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className="w-3 h-3 rounded-full border border-black/30"
                      style={{ backgroundColor: tpl.colors.accent }}
                    />
                    <span
                      className="w-3 h-3 rounded-full border border-black/30"
                      style={{ backgroundColor: tpl.colors.bg }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: Funnel Mode B - AI Atmosphere Picker */}
      {isFunnel && data.funnel_mode === "generate_with_pic" && (
        <FunnelAiAtmospherePicker
          data={data}
          setData={setData}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNNEL MODE B : Choix de l'ambiance visuelle IA
// ─────────────────────────────────────────────────────────────────────────────

function FunnelAiAtmospherePicker({
  data,
  setData,
}: {
  data: WizardState;
  setData: any;
}) {
  const styles = [
    {
      id: "crimson",
      name: "Audacieux & Mode",
      subtitle: "Idéal vêtements, streetwear, maroquinerie de caractère",
      tag: "Haute Conversion",
      accent: "#9c1220",
      bg: "#141113",
      text: "#f9f8f6",
    },
    {
      id: "energetic",
      name: "Sport & Dynamique (Pulse)",
      subtitle: "Idéal fitness, nutrition, gadgets high-tech & action",
      tag: "Énergique",
      accent: "#0284c7",
      bg: "#0b1220",
      text: "#f8fafc",
    },
    {
      id: "natural",
      name: "Organique & Terroir",
      subtitle: "Idéal cosmétiques naturels, miels, huiles, artisanat",
      tag: "Naturel",
      accent: "#15803d",
      bg: "#f4f1ea",
      text: "#1c1917",
    },
    {
      id: "luxe-noir",
      name: "Luxe Sombre & Prestige",
      subtitle: "Idéal haute horlogerie, parfums rares, maroquinerie prestige",
      tag: "Prestige",
      accent: "#d4af37",
      bg: "#0a0a0c",
      text: "#f5f5f7",
    },
    {
      id: "monochrome",
      name: "Minimaliste Épuré",
      subtitle: "Idéal design sobre, ameublement scandinave, mode intemporelle",
      tag: "Minimal",
      accent: "#111827",
      bg: "#ffffff",
      text: "#000000",
    },
    {
      id: "phantom",
      name: "Cyber & Futuriste",
      subtitle: "Idéal gaming, audio immersif, périphériques high-tech",
      tag: "Cyber",
      accent: "#8b5cf6",
      bg: "#090912",
      text: "#e2e8f0",
    },
  ];

  return (
    <div className="space-y-4 text-left animate-in fade-in duration-300">
      <div className="p-4 rounded-2xl bg-[#2540ea]/10 border border-[#2540ea]/30 flex items-start gap-3">
        <Wand2 className="w-5 h-5 text-[#93c5fd] shrink-0 mt-0.5" />
        <div className="text-xs text-white/80 leading-relaxed">
          <span className="font-bold text-white">Génération Intelligente IA : </span>
          Sélectionnez l&apos;ambiance directrice de votre page. À l&apos;étape suivante (Étape 3), vous téléverserez
          la photo de votre produit star et ses tarifs réels. Le moteur adaptera automatiquement les typographies,
          les contrastes et la structure autour de votre article.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {styles.map((s) => {
          const isSelected = data.theme === s.id;
          return (
            <div
              key={s.id}
              onClick={() =>
                setData((p: any) => ({
                  ...p,
                  theme: s.id,
                  selected_template_id: s.id,
                  primary_color: s.accent,
                }))
              }
              className={cn(
                "p-5 rounded-2xl border transition-all duration-200 cursor-pointer relative flex flex-col justify-between group",
                isSelected
                  ? "border-[#60a5fa] bg-gradient-to-b from-[#2540ea]/20 to-[#0e1338] shadow-xl shadow-[#2540ea]/30 ring-2 ring-[#2540ea]/60 scale-[1.01]"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.04]"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <span
                  className="text-[10px] font-bold px-2.5 py-1 rounded-md"
                  style={{
                    backgroundColor: `${s.accent}25`,
                    color: s.accent,
                    border: `1px solid ${s.accent}50`,
                  }}
                >
                  {s.tag}
                </span>

                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center transition-all",
                    isSelected
                      ? "bg-[#2540ea] text-white shadow-sm shadow-[#2540ea]/60"
                      : "border border-white/20 text-transparent"
                  )}
                >
                  <Check className="w-3 h-3" />
                </div>
              </div>

              <div className="space-y-1 mb-3">
                <h3 className="text-base font-extrabold text-white group-hover:text-[#93c5fd] transition-colors">
                  {s.name}
                </h3>
                <p className="text-xs text-white/50">{s.subtitle}</p>
              </div>

              <div
                className="rounded-xl p-3 border mb-2 text-xs overflow-hidden flex items-center justify-between"
                style={{
                  backgroundColor: s.bg,
                  borderColor: `${s.accent}40`,
                  color: s.text,
                }}
              >
                <span className="font-bold text-[11px] truncate">Nuancier d&apos;ambiance</span>
                <span
                  className="w-4 h-4 rounded-full border border-black/20"
                  style={{ backgroundColor: s.accent }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 : Saisie des Produits Réels (Anti-Contenu Démo)
// ─────────────────────────────────────────────────────────────────────────────

function Step3ProductEntry({
  data,
  setData,
  type,
}: {
  data: WizardState;
  setData: any;
  type: "boutique" | "funnel";
}) {
  const isFunnel = type === "funnel";

  if (isFunnel) {
    return <Step3FunnelStarProduct data={data} setData={setData} />;
  }

  return <Step3BoutiqueCatalog data={data} setData={setData} />;
}

// ─── Étape 3 pour FUNNEL : Saisie du Produit Star ────────────────────────────

function Step3FunnelStarProduct({
  data,
  setData,
}: {
  data: WizardState;
  setData: any;
}) {
  const currentProduct = data.products[0] || {
    name: "",
    price: 0,
    compare_price: 0,
    description: "",
    benefits: [
      "Livraison rapide 58 Wilayas en 24h-48h",
      "Paiement cash à la livraison (COD)",
      "Essayage et vérification avant paiement",
    ],
    images: [],
  };

  const rawImages = currentProduct.images || [];
  const images: WizardImageItem[] = useMemo(() => {
    return rawImages.map((img: any) => {
      if (typeof img === "string") {
        return { url: img, public_id: `img_${Date.now()}` };
      }
      return img;
    });
  }, [rawImages]);

  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);

  // Keep index within bounds if images change
  useEffect(() => {
    if (selectedImageIndex >= images.length && images.length > 0) {
      setSelectedImageIndex(images.length - 1);
    }
  }, [images.length, selectedImageIndex]);

  const activeImage = images[selectedImageIndex] || images[0] || null;
  const activeUrl = activeImage?.url || null;

  const onDropProductImages = (acceptedFiles: File[]) => {
    if (!acceptedFiles || acceptedFiles.length === 0) return;

    const newItems: WizardImageItem[] = acceptedFiles.map((file) => ({
      url: URL.createObjectURL(file),
      public_id: `local:${file.name}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      file,
    }));

    const prevList = (currentProduct.images || []).map((img: any) =>
      typeof img === "string" ? { url: img, public_id: `img_${Date.now()}` } : img
    );

    const updatedList = [...prevList, ...newItems];

    const updatedProduct = {
      ...currentProduct,
      pending_image_file: updatedList[0]?.file || null,
      images: updatedList,
    };

    setData((p: any) => ({
      ...p,
      products: [updatedProduct],
    }));

    if (prevList.length === 0) {
      setSelectedImageIndex(0);
    } else {
      setSelectedImageIndex(prevList.length);
    }

    toast.success(`${acceptedFiles.length} photo(s) ajoutée(s) !`);
  };

  const removeProductImage = (indexToRemove: number) => {
    const prevList = (currentProduct.images || []).map((img: any) =>
      typeof img === "string" ? { url: img, public_id: `img_${Date.now()}` } : img
    );
    const item = prevList[indexToRemove];
    if (item?.url && isBlobUrl(item.url)) {
      try {
        URL.revokeObjectURL(item.url);
      } catch {}
    }

    const updatedList = prevList.filter((_, i) => i !== indexToRemove);

    const updatedProduct = {
      ...currentProduct,
      pending_image_file: updatedList[0]?.file || null,
      images: updatedList,
    };

    setData((p: any) => ({
      ...p,
      products: [updatedProduct],
    }));

    if (selectedImageIndex >= updatedList.length) {
      setSelectedImageIndex(Math.max(0, updatedList.length - 1));
    }
    toast.info("Photo retirée.");
  };

  const setAsPrimaryImage = (indexToPromote: number) => {
    if (indexToPromote <= 0) return;
    const prevList = (currentProduct.images || []).map((img: any) =>
      typeof img === "string" ? { url: img, public_id: `img_${Date.now()}` } : img
    );
    const target = prevList[indexToPromote];
    const rest = prevList.filter((_, i) => i !== indexToPromote);
    const updatedList = [target, ...rest];

    const updatedProduct = {
      ...currentProduct,
      pending_image_file: updatedList[0]?.file || null,
      images: updatedList,
    };

    setData((p: any) => ({
      ...p,
      products: [updatedProduct],
    }));

    setSelectedImageIndex(0);
    toast.success("Photo définie comme couverture principale !");
  };

  const removeAllImages = () => {
    (currentProduct.images || []).forEach((img: any) => {
      if (img?.url && isBlobUrl(img.url)) {
        try {
          URL.revokeObjectURL(img.url);
        } catch {}
      }
    });
    const updatedProduct = {
      ...currentProduct,
      pending_image_file: null,
      images: [],
    };
    setData((p: any) => ({
      ...p,
      products: [updatedProduct],
    }));
    setSelectedImageIndex(0);
    toast.info("Toutes les photos ont été retirées.");
  };

  const { getRootProps, getInputProps, isDragActive, open: openFileDialog } = useDropzone({
    onDrop: onDropProductImages,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple: true,
    noClick: images.length > 0,
  });

  const updateProductField = (field: string, val: any) => {
    const updated = { ...currentProduct, [field]: val };
    setData((p: any) => ({ ...p, products: [updated] }));
  };

  const updateBenefit = (idx: number, val: string) => {
    const bens = [...(currentProduct.benefits || ["", "", ""])];
    bens[idx] = val;
    updateProductField("benefits", bens);
  };

  const options: ProductOption[] = currentProduct.options || [];

  const addSizePreset = () => {
    const existing = options.find((o) => o.name.toLowerCase().includes("taille") || o.name.toLowerCase().includes("size"));
    if (existing) {
      toast.info("L'option Taille existe déjà.");
      return;
    }
    const newOption: ProductOption = {
      name: "Taille",
      type: "chip",
      values: [
        { label: "S", available: true },
        { label: "M", available: true },
        { label: "L", available: true },
        { label: "XL", available: true },
      ],
    };
    updateProductField("options", [...options, newOption]);
    toast.success("Option Taille (S, M, L, XL) ajoutée !");
  };

  const addColorPreset = () => {
    const existing = options.find((o) => o.name.toLowerCase().includes("couleur") || o.name.toLowerCase().includes("color"));
    if (existing) {
      toast.info("L'option Couleur existe déjà.");
      return;
    }
    const newOption: ProductOption = {
      name: "Couleur",
      type: "swatch",
      values: [
        { label: "Noir", hex: "#111111", available: true },
        { label: "Blanc", hex: "#ffffff", available: true },
        { label: "Bleu", hex: "#2540ea", available: true },
      ],
    };
    updateProductField("options", [...options, newOption]);
    toast.success("Option Couleur ajoutée !");
  };

  const addCustomOption = () => {
    const newOption: ProductOption = {
      name: "",
      type: "chip",
      values: [{ label: "", available: true }],
    };
    updateProductField("options", [...options, newOption]);
  };

  const removeOption = (idx: number) => {
    updateProductField("options", options.filter((_, i) => i !== idx));
  };

  const updateOptionName = (idx: number, name: string) => {
    const updated = [...options];
    if (updated[idx]) {
      updated[idx] = { ...updated[idx], name };
      updateProductField("options", updated);
    }
  };

  const updateOptionType = (idx: number, type: "swatch" | "chip") => {
    const updated = [...options];
    if (updated[idx]) {
      updated[idx] = {
        ...updated[idx],
        type,
        values: updated[idx].values.map((v) => ({
          ...v,
          hex: v.hex || (type === "swatch" ? "#2540ea" : undefined),
        })),
      };
      updateProductField("options", updated);
    }
  };

  const addOptionValue = (optIdx: number) => {
    const updated = [...options];
    if (updated[optIdx]) {
      updated[optIdx] = {
        ...updated[optIdx],
        values: [
          ...updated[optIdx].values,
          {
            label: "",
            hex: updated[optIdx].type === "swatch" ? "#2540ea" : undefined,
            available: true,
          },
        ],
      };
      updateProductField("options", updated);
    }
  };

  const removeOptionValue = (optIdx: number, valIdx: number) => {
    const updated = [...options];
    if (updated[optIdx]) {
      updated[optIdx] = {
        ...updated[optIdx],
        values: updated[optIdx].values.filter((_, i) => i !== valIdx),
      };
      updateProductField("options", updated);
    }
  };

  const updateOptionValue = (
    optIdx: number,
    valIdx: number,
    field: "label" | "hex" | "available",
    val: any
  ) => {
    const updated = [...options];
    if (updated[optIdx] && updated[optIdx].values[valIdx]) {
      const currentVal = updated[optIdx].values[valIdx];
      const newVal: ProductOptionValue = {
        label: field === "label" ? String(val) : currentVal.label,
        hex: field === "hex" ? String(val) : currentVal.hex,
        available: field === "available" ? Boolean(val) : currentVal.available,
      };
      const vals = [...updated[optIdx].values];
      vals[valIdx] = newVal;
      updated[optIdx] = { ...updated[optIdx], values: vals };
      updateProductField("options", updated);
    }
  };

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      {/* Reassurance Banner */}
      <div className="p-4 rounded-2xl bg-[#2540ea]/10 border border-[#2540ea]/30 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-[#93c5fd] shrink-0 mt-0.5" />
        <div className="text-xs text-white/80 leading-relaxed">
          <span className="font-bold text-white">Votre Produit Star en vedette : </span>
          Ce produit sera le cœur de votre page de vente mono-produit. Renseignez son vrai nom, son prix réel
          et ajoutez ses photos. Vous pouvez en mettre autant que vous voulez — la première photo servira de couverture principale.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Photo Upload Box (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-white/90 flex items-center gap-2">
              <span>Photos du produit</span>
              {images.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#2540ea]/30 text-[#93c5fd] text-[10px] font-bold border border-[#2540ea]/40">
                  {images.length} {images.length > 1 ? "photos" : "photo"}
                </span>
              )}
            </label>
            {images.length > 1 ? (
              <button
                type="button"
                onClick={removeAllImages}
                className="text-[10px] text-red-400/80 hover:text-red-300 transition-colors"
              >
                Tout supprimer
              </button>
            ) : (
              <span className="text-[10px] text-[#93c5fd]">Fortement recommandé</span>
            )}
          </div>

          <div
            {...getRootProps()}
            className={cn(
              "border-2 rounded-3xl transition-all relative overflow-hidden group",
              isDragActive
                ? "border-[#2540ea] bg-[#2540ea]/15 shadow-lg shadow-[#2540ea]/20"
                : images.length > 0
                ? "border-white/15 bg-black/40"
                : "border-dashed border-white/20 hover:border-white/40 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04]"
            )}
          >
            <input {...getInputProps()} />

            {/* Active drag overlay */}
            {isDragActive && (
              <div className="absolute inset-0 bg-[#2540ea]/40 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-2 text-white">
                <ImagePlus className="w-8 h-8 text-[#93c5fd] animate-bounce" />
                <p className="text-xs font-bold text-white">Déposez vos photos pour les ajouter...</p>
              </div>
            )}

            {images.length > 0 && activeUrl ? (
              <div className="relative aspect-square w-full flex flex-col items-center justify-center p-3">
                {/* Top Bar: Badge & Delete */}
                <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-auto">
                  {selectedImageIndex === 0 ? (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/25 border border-amber-500/50 text-amber-300 text-[11px] font-bold backdrop-blur-md shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>Photo Principale</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 border border-white/20 text-white/90 text-[11px] font-medium backdrop-blur-md">
                      <span>Photo {selectedImageIndex + 1} / {images.length}</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeProductImage(selectedImageIndex);
                    }}
                    className="p-1.5 rounded-xl bg-black/60 hover:bg-red-500/40 border border-white/20 hover:border-red-500/40 text-white/80 hover:text-red-200 text-xs transition-colors backdrop-blur-md shadow-sm"
                    title="Supprimer cette photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Main Preview Image */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeUrl}
                  alt={`Photo ${selectedImageIndex + 1}`}
                  className="w-full h-full object-contain rounded-2xl transition-transform"
                />

                {/* Bottom Bar: Set as primary button */}
                {selectedImageIndex > 0 && (
                  <div className="absolute bottom-3 inset-x-3 z-20">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAsPrimaryImage(selectedImageIndex);
                      }}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/90 to-amber-600/90 hover:from-amber-500 hover:to-amber-600 text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
                    >
                      <Star className="w-3.5 h-3.5 fill-black text-black" />
                      Définir comme photo principale
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-square flex flex-col items-center justify-center p-6 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2540ea]/20 to-[#60a5fa]/20 border border-[#2540ea]/30 flex items-center justify-center text-[#93c5fd] mb-3 group-hover:scale-110 transition-transform">
                  <ImagePlus className="w-7 h-7" />
                </div>
                <p className="text-sm font-bold text-white">Glissez les photos de votre produit</p>
                <p className="text-xs text-white/50 mt-1 max-w-[220px]">
                  PNG, JPG ou WebP · Vous pouvez en ajouter plusieurs à la fois
                </p>
                <div className="mt-3 px-3 py-1 rounded-full bg-white/[0.06] border border-white/10 text-[11px] text-[#93c5fd]">
                  + Parcourir mes fichiers
                </div>
              </div>
            )}
          </div>

          {/* Thumbnails Gallery Strip */}
          {images.length > 0 && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {images.map((img, idx) => {
                  const isPrimary = idx === 0;
                  const isSelected = idx === selectedImageIndex;
                  return (
                    <div
                      key={img.public_id || img.url || idx}
                      onClick={() => setSelectedImageIndex(idx)}
                      className={cn(
                        "relative w-14 h-14 rounded-xl overflow-hidden cursor-pointer shrink-0 border-2 transition-all group",
                        isSelected
                          ? "border-[#93c5fd] ring-2 ring-[#2540ea]/60 scale-105"
                          : "border-white/15 hover:border-white/40 opacity-70 hover:opacity-100 bg-black/40"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt={`Miniature ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Primary star badge */}
                      {isPrimary && (
                        <div
                          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-amber-400 text-black flex items-center justify-center text-[9px] font-bold shadow-md"
                          title="Photo principale"
                        >
                          ★
                        </div>
                      )}

                      {/* Quick delete on hover */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProductImage(idx);
                        }}
                        className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Supprimer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  );
                })}

                {/* + Add More Photos Button */}
                <button
                  type="button"
                  onClick={() => openFileDialog()}
                  className="w-14 h-14 rounded-xl border-2 border-dashed border-white/20 hover:border-[#93c5fd] bg-white/[0.03] hover:bg-[#2540ea]/10 flex flex-col items-center justify-center gap-0.5 text-white/50 hover:text-white shrink-0 transition-colors"
                  title="Ajouter d'autres photos"
                >
                  <Plus className="w-4 h-4 text-[#93c5fd]" />
                  <span className="text-[9px] font-medium">Ajouter</span>
                </button>
              </div>

              <p className="text-[11px] text-white/40 text-center leading-tight">
                La photo avec l&apos;étoile <span className="text-amber-400 font-bold">★</span> est la couverture principale du funnel.
              </p>
            </div>
          )}

          {images.length === 0 && (
            <p className="text-[11px] text-white/40 text-center">
              Cliquez ou glissez une ou plusieurs photos ici
            </p>
          )}
        </div>

        {/* Product Details & Benefits (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/90 flex items-center justify-between">
              <span>Nom du produit star <span className="text-red-400">*</span></span>
              <span className="text-[10px] text-white/40">Visible sur le titre & bon de commande</span>
            </label>
            <input
              type="text"
              placeholder="Ex : Écouteurs Sans Fil Pro Bass IPX7"
              value={currentProduct.name || ""}
              onChange={(e) => updateProductField("name", e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none"
            />
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/90">
                Prix de vente (DZD) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                placeholder="Ex : 4900"
                value={currentProduct.price || ""}
                onChange={(e) => updateProductField("price", Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-white/90">Prix barré promo (DZD)</label>
              <input
                type="number"
                placeholder="Ex : 6900"
                value={currentProduct.compare_price || ""}
                onChange={(e) => updateProductField("compare_price", Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none"
              />
            </div>
          </div>

          {/* Short description */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-white/90">Description courte & accroche</label>
            <textarea
              rows={2}
              placeholder="Ex : Profitez d'une qualité audio exceptionnelle avec réduction de bruit active et autonomie de 30 heures..."
              value={currentProduct.description || ""}
              onChange={(e) => updateProductField("description", e.target.value)}
              className="w-full px-4 py-2 rounded-xl text-xs text-white placeholder-white/35 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none resize-none"
            />
          </div>

          {/* 3 Key Benefits */}
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-white/90 flex items-center justify-between">
              <span>3 Bénéfices clés (Arguments de réassurance)</span>
              <span className="text-[10px] text-white/40">Affichés sous le prix</span>
            </label>

            {(currentProduct.benefits || ["", "", ""]).map((ben, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-[#2540ea]/20 text-[#93c5fd] flex items-center justify-center text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  placeholder={`Bénéfice ${i + 1}...`}
                  value={ben}
                  onChange={(e) => updateBenefit(i, e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl text-xs text-white placeholder-white/35 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* Options & Variantes (Tailles, Couleurs...) */}
          <div className="pt-3 border-t border-white/10 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-white/90 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#93c5fd]" />
                  <span>Options & Variantes (Tailles, Couleurs...)</span>
                  {options.length > 0 && (
                    <span className="px-2 py-0.2 rounded-full bg-[#2540ea]/30 text-[#93c5fd] text-[10px] font-bold border border-[#2540ea]/40">
                      {options.length} {options.length > 1 ? "groupes" : "groupe"}
                    </span>
                  )}
                </label>
                <p className="text-[11px] text-white/45 mt-0.5">
                  Permet aux acheteurs de choisir leur taille ou couleur sur votre bon de commande.
                </p>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={addSizePreset}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-[#2540ea]/20 hover:bg-[#2540ea]/30 text-[#93c5fd] border border-[#2540ea]/40 flex items-center gap-1 transition-colors"
                  title="Ajouter automatiquement Taille (S, M, L, XL)"
                >
                  <Plus className="w-3 h-3" />
                  + Tailles
                </button>
                <button
                  type="button"
                  onClick={addColorPreset}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 flex items-center gap-1 transition-colors"
                  title="Ajouter automatiquement Nuancier Couleur"
                >
                  <Plus className="w-3 h-3" />
                  + Couleurs
                </button>
                <button
                  type="button"
                  onClick={addCustomOption}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white/5 hover:bg-white/10 text-white/80 border border-white/15 flex items-center gap-1 transition-colors"
                  title="Ajouter une option sur mesure"
                >
                  <Plus className="w-3 h-3" />
                  + Autre
                </button>
              </div>
            </div>

            {/* Empty state */}
            {options.length === 0 ? (
              <div className="p-3.5 rounded-xl border border-dashed border-white/15 bg-white/[0.02] flex items-center justify-between gap-3">
                <p className="text-xs text-white/50">
                  Ce produit est actuellement vendu sans variante (modèle standard unique).
                </p>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={addSizePreset}
                    className="text-xs font-semibold text-[#93c5fd] hover:text-white underline underline-offset-2"
                  >
                    Activer Tailles
                  </button>
                  <span className="text-white/20">·</span>
                  <button
                    type="button"
                    onClick={addColorPreset}
                    className="text-xs font-semibold text-[#93c5fd] hover:text-white underline underline-offset-2"
                  >
                    Activer Couleurs
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {options.map((opt, optIdx) => (
                  <div
                    key={optIdx}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/15 space-y-3 relative group"
                  >
                    {/* Option Top Bar */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={opt.name}
                          onChange={(e) => updateOptionName(optIdx, e.target.value)}
                          placeholder="Nom de l'option (ex: Taille, Couleur, Modèle)"
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#060612]/80 border border-white/20 focus:border-[#93c5fd] focus:outline-none w-full max-w-[200px]"
                        />

                        {/* Type toggle */}
                        <div className="flex items-center bg-[#060612]/60 p-0.5 rounded-lg border border-white/15 text-[10px]">
                          <button
                            type="button"
                            onClick={() => updateOptionType(optIdx, "chip")}
                            className={cn(
                              "px-2 py-1 rounded-md font-medium transition-all",
                              opt.type !== "swatch"
                                ? "bg-[#2540ea] text-white shadow-sm"
                                : "text-white/50 hover:text-white"
                            )}
                          >
                            Puces / Boutons
                          </button>
                          <button
                            type="button"
                            onClick={() => updateOptionType(optIdx, "swatch")}
                            className={cn(
                              "px-2 py-1 rounded-md font-medium transition-all",
                              opt.type === "swatch"
                                ? "bg-[#2540ea] text-white shadow-sm"
                                : "text-white/50 hover:text-white"
                            )}
                          >
                            Nuancier Couleurs
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeOption(optIdx)}
                        className="p-1.5 rounded-lg text-red-400/70 hover:text-red-300 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                        title="Supprimer cette option"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Option Values */}
                    <div className="space-y-2 pt-1 border-t border-white/5">
                      <div className="flex flex-wrap items-center gap-2">
                        {opt.values.map((val, valIdx) => (
                          <div
                            key={valIdx}
                            className="flex items-center gap-1.5 p-1.5 pl-2 rounded-xl bg-[#060612]/90 border border-white/15 shadow-sm"
                          >
                            {/* Color picker for swatch */}
                            {opt.type === "swatch" && (
                              <div className="relative flex items-center justify-center">
                                <input
                                  type="color"
                                  value={val.hex || "#2540ea"}
                                  onChange={(e) =>
                                    updateOptionValue(optIdx, valIdx, "hex", e.target.value)
                                  }
                                  className="w-5 h-5 rounded-full cursor-pointer bg-transparent border-0 opacity-0 absolute inset-0 z-10"
                                />
                                <div
                                  className="w-5 h-5 rounded-full border border-white/30 shadow-inner"
                                  style={{ backgroundColor: val.hex || "#2540ea" }}
                                />
                              </div>
                            )}

                            {/* Value label input */}
                            <input
                              type="text"
                              value={val.label}
                              onChange={(e) =>
                                updateOptionValue(optIdx, valIdx, "label", e.target.value)
                              }
                              placeholder={opt.type === "swatch" ? "Nom couleur" : "Taille"}
                              className="w-20 px-2 py-0.5 rounded-md text-xs text-white bg-white/5 border border-white/10 focus:border-[#93c5fd] focus:outline-none"
                            />

                            {/* Remove value button */}
                            {opt.values.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeOptionValue(optIdx, valIdx)}
                                className="w-5 h-5 rounded-md text-white/40 hover:text-red-400 flex items-center justify-center hover:bg-white/10 transition-colors"
                                title="Supprimer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Add value chip */}
                        <button
                          type="button"
                          onClick={() => addOptionValue(optIdx)}
                          className="px-2.5 py-1.5 rounded-xl border border-dashed border-white/20 hover:border-[#93c5fd] text-[11px] font-semibold text-[#93c5fd] hover:text-white bg-white/[0.02] hover:bg-[#2540ea]/10 flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          Ajouter une valeur
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Étape 3 pour BOUTIQUE : Catalogue Multi-Produits ─────────────────────────

function Step3BoutiqueCatalog({
  data,
  setData,
}: {
  data: WizardState;
  setData: any;
}) {
  const [draftName, setDraftName] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [draftComparePrice, setDraftComparePrice] = useState("");
  const [draftCategory, setDraftCategory] = useState(data.category || CATEGORIES[0] || "Mode & Vêtements");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftPreviewUrl, setDraftPreviewUrl] = useState<string | null>(null);

  const onDropDraftImage = (files: File[]) => {
    if (!files[0]) return;
    const file = files[0];
    setDraftFile(file);
    setDraftPreviewUrl(URL.createObjectURL(file));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropDraftImage,
    accept: { "image/*": [] },
    multiple: false,
  });

  const handleAddProduct = () => {
    if (!draftName.trim() || draftName.trim().length < 2) {
      toast.error("Veuillez renseigner un nom d'article (au moins 2 caractères).");
      return;
    }
    const numPrice = Number(draftPrice);
    if (!draftPrice || isNaN(numPrice) || numPrice < 100) {
      toast.error("Veuillez indiquer un prix valide d'au moins 100 DA.");
      return;
    }

    const newProduct: WizardProductDraft = {
      name: draftName.trim(),
      price: numPrice,
      compare_price: draftComparePrice ? Number(draftComparePrice) : undefined,
      category: draftCategory || data.category || "Général",
      description: draftDescription.trim(),
      pending_image_file: draftFile,
      images: draftPreviewUrl ? [{ url: draftPreviewUrl, public_id: `local:${draftFile?.name || "prod"}` }] : [],
    };

    setData((p: any) => ({
      ...p,
      products: [...p.products, newProduct],
    }));

    // Reset draft fields
    setDraftName("");
    setDraftPrice("");
    setDraftComparePrice("");
    setDraftDescription("");
    setDraftFile(null);
    setDraftPreviewUrl(null);
    toast.success("Article ajouté au catalogue !");
  };

  const handleDeleteProduct = (index: number) => {
    setData((p: any) => ({
      ...p,
      products: p.products.filter((_: any, i: number) => i !== index),
    }));
    toast.info("Article retiré du catalogue.");
  };

  const productsCount = data.products.length;

  return (
    <div className="space-y-6 text-left animate-in fade-in duration-300">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-[#2540ea]/10 border border-[#2540ea]/30 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Store className="w-5 h-5 text-[#93c5fd] shrink-0 mt-0.5" />
          <div className="text-xs text-white/80 leading-relaxed">
            <span className="font-bold text-white">Catalogue Initial de votre Boutique : </span>
            Ajoutez au moins un produit avec son nom, son prix réel et sa photo pour composer votre vitrine.
            Ces articles apparaîtront directement sur les rayons de votre boutique en ligne.
          </div>
        </div>

        <div className="shrink-0 px-3 py-1.5 rounded-xl bg-white/[0.06] border border-white/10 text-right">
          <span className="text-[11px] text-white/50 block">Articles ajoutés</span>
          <span className={cn("text-sm font-extrabold", productsCount > 0 ? "text-emerald-400" : "text-amber-400")}>
            {productsCount} / min. 1
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ADD PRODUCT FORM (5 cols) */}
        <div className="lg:col-span-6 p-5 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Package className="w-4 h-4 text-[#93c5fd]" />
            <h3 className="text-sm font-bold text-white">Ajouter un article au catalogue</h3>
          </div>

          {/* Mini Image Upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/80">Photo du produit</label>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-colors flex items-center justify-center gap-3",
                isDragActive ? "border-[#2540ea] bg-[#2540ea]/10" : "border-white/15 hover:border-white/30 bg-black/20"
              )}
            >
              <input {...getInputProps()} />
              {draftPreviewUrl ? (
                <div className="flex items-center gap-3 w-full justify-between">
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={draftPreviewUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover" />
                    <span className="text-xs text-white/80 font-medium truncate max-w-[150px]">
                      {draftFile?.name || "Image sélectionnée"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDraftFile(null);
                      setDraftPreviewUrl(null);
                    }}
                    className="p-1 rounded-md text-red-400 hover:bg-red-500/20 text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-white/50 text-xs py-1">
                  <ImagePlus className="w-4 h-4 text-[#93c5fd]" />
                  <span>Glissez une image ou cliquez pour parcourir</span>
                </div>
              )}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">
              Nom de l&apos;article <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex : Veste Bomber Urbain Kaki"
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs text-white placeholder-white/30 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none"
            />
          </div>

          {/* Price & Compare Price */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">
                Prix (DZD) <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                placeholder="Ex : 5500"
                value={draftPrice}
                onChange={(e) => setDraftPrice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs text-white placeholder-white/30 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-white/80">Prix promo barré (DZD)</label>
              <input
                type="number"
                placeholder="Ex : 7500"
                value={draftComparePrice}
                onChange={(e) => setDraftComparePrice(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl text-xs text-white placeholder-white/30 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none"
              />
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Rayon / Catégorie</label>
            <select
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs text-white bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-[#0b0b14]">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-white/80">Description rapide</label>
            <input
              type="text"
              placeholder="Ex : Coupe droite, tissu résistant, disponible en plusieurs tailles."
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs text-white placeholder-white/30 bg-[#060612]/70 border border-white/15 focus:border-[#93c5fd] focus:outline-none"
            />
          </div>

          {/* Submit button */}
          <button
            type="button"
            onClick={handleAddProduct}
            className="w-full py-2.5 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-2 transition-all bg-[#2540ea] hover:bg-[#1a2ca3] shadow-md shadow-[#2540ea]/40"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter ce produit au catalogue</span>
          </button>
        </div>

        {/* LIST OF ADDED PRODUCTS (6 cols) */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Articles au catalogue</span>
              <span className="text-xs font-normal text-white/50">({productsCount})</span>
            </h3>
            {productsCount > 0 && (
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Prêt pour le déploiement
              </span>
            )}
          </div>

          {productsCount === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-white/40">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-white/70">Aucun produit dans le catalogue pour l&apos;instant</p>
              <p className="text-[11px] text-white/40 max-w-xs mx-auto">
                Remplissez le formulaire à gauche pour enregistrer votre premier article.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {data.products.map((p, idx) => {
                const imgUrl =
                  p.images?.[0] && typeof p.images[0] === "object"
                    ? (p.images[0] as any).url
                    : null;
                return (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 group hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {imgUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={imgUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xl">🛍️</span>
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-white truncate">{p.name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-white/50">
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70">{p.category}</span>
                          {p.compare_price && (
                            <span className="line-through text-white/40">{formatPrice(p.compare_price)}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-extrabold text-[#93c5fd]">{formatPrice(Number(p.price || 0))}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(idx)}
                        className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Supprimer l'article"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


