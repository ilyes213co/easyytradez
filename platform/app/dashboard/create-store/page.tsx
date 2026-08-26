"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  ChevronLeft, ChevronRight, Check, Trash2, 
  ImagePlus, Store, Palette, Package, Zap,
  Loader2, Type, Smartphone, LayoutGrid, Sparkles,
  CheckCircle2, Globe, Rocket, AlertCircle, X,
  ArrowRight, RefreshCw
} from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";
import { createClient } from "@/lib/supabase";
import { cn, slugify, formatPrice } from "@/lib/utils";
import { storesApi, productsApi, uploadApi, deployApi } from "@/lib/api";
import type { Store as StoreType, Product, StoreInsert } from "@/types/database";

// ─── Constants & Types ────────────────────────────────────────────────────────

const CATEGORIES = [
  "Mode & Vêtements", "Électronique", "Maison & Décoration", 
  "Beauté & Soins", "Alimentation", "Sport & Loisirs", 
  "Jouets & Enfants", "Art & Artisanat", "Services", "Autre"
];

const COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Slate", value: "#475569" },
  { name: "Black", value: "#000000" },
];

const FONTS = [
  { id: "modern", name: "Moderne", desc: "Sans-serif propre (Inter)", class: "font-sans" },
  { id: "classic", name: "Classique", desc: "Serif élégant (Merriweather)", class: "font-serif" },
  { id: "playful", name: "Playful", desc: "Rond et amical (Quicksand)", class: "font-mono" },
];

const THEMES = [
  { id: "modern", name: "Moderne", desc: "Clean & Direct", color: "bg-indigo-500" },
  { id: "luxury", name: "Luxe", desc: "Élégant & Sombre", color: "bg-amber-900" },
  { id: "minimal", name: "Minimaliste", desc: "Focus produit", color: "bg-gray-100" },
  { id: "colorful", name: "Coloré", desc: "Vibrant & Joyeux", color: "bg-pink-500" },
  { id: "tech", name: "Tech", desc: "Futuriste & Sombre", color: "bg-blue-900" },
  { id: "nature", name: "Nature", desc: "Organique & Frais", color: "bg-emerald-600" },
] as const;

const ANIMATIONS = [
  { id: "none", name: "Aucune", desc: "Statique et rapide" },
  { id: "soft", name: "Douce", desc: "Apparitions fluides" },
  { id: "dynamic", name: "Dynamique", desc: "Mouvements actifs" },
  { id: "spectacular", name: "Spectaculaire", desc: "Expérience immersive" },
] as const;

type ThemeId = typeof THEMES[number]["id"];
type AnimationId = typeof ANIMATIONS[number]["id"];
type WizardProductDraft = Partial<Product> & {
  status?: string;
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
  font_family: string;
  theme: ThemeId;
  animation_style: AnimationId;
  products: WizardProductDraft[];
}

const INITIAL_STATE: WizardState = {
  name: "",
  category: CATEGORIES[0] || "Autre",
  description: "",
  whatsapp_phone: "",
  logo_url: null,
  logo_public_id: null,
  primary_color: COLORS[0]?.value || "#6366f1",
  font_family: "modern",
  theme: "modern",
  animation_style: "soft",
  products: [],
};

const PENDING_DEPLOY_KEY = "store_pending_deploy_job";

const isBlobUrl = (value: string | null | undefined) => Boolean(value?.startsWith("blob:"));

function serializeWizardDraft(state: WizardState) {
  return {
    ...state,
    logo_url: isBlobUrl(state.logo_url) ? null : state.logo_url,
    logo_public_id: state.logo_public_id?.startsWith("local:") ? null : state.logo_public_id,
    products: state.products.map(({ pending_image_file, ...product }) => ({
      ...product,
      images: (product.images ?? []).filter(
        (image: any) => image?.url && !isBlobUrl(image.url) && !String(image.public_id ?? "").startsWith("local:")
      ),
    })),
  };
}

// ─── Validation Schemas ───────────────────────────────────────────────────────

const step1Schema = z.object({
  name: z.string().min(3, "Nom trop court").max(50),
  category: z.string().min(1, "Choisissez une catégorie"),
  description: z.string().max(200, "Description trop longue"),
  whatsapp_phone: z.string().regex(/^(\+213|0)(5|6|7)\d{8}$/, "Numéro algérien invalide"),
});

// ─── Page Component ──────────────────────────────────────────────────────────

export default function CreateStorePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardState>(INITIAL_STATE);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [resultStore, setResultStore] = useState<StoreType | null>(null);
  const [genMessage, setGenMessage] = useState("");
  const [elapsedSec, setElapsedSec] = useState(0);
  const [pendingDeploy, setPendingDeploy] = useState<{ jobId: string; storeId: string } | null>(null);
  const genTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("store_wizard_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sanitized = serializeWizardDraft({
          ...INITIAL_STATE,
          ...parsed,
          products: parsed.products ?? [],
        } as WizardState);
        setData(prev => ({ ...prev, ...sanitized }));
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(PENDING_DEPLOY_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.jobId && parsed?.storeId) {
        setPendingDeploy({ jobId: parsed.jobId, storeId: parsed.storeId });
      }
    } catch {
      localStorage.removeItem(PENDING_DEPLOY_KEY);
    }
  }, []);

  useEffect(() => {
    if (step < 5 && !isGenerating) {
      localStorage.setItem("store_wizard_draft", JSON.stringify(serializeWizardDraft(data)));
    }
  }, [data, step, isGenerating]);

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
    localStorage.removeItem(PENDING_DEPLOY_KEY);
    setPendingDeploy(null);
  };

  const handleNext = () => {
    if (step === 1) {
      const res = step1Schema.safeParse(data);
      if (!res.success) {
        const errs: Record<string, string> = {};
        res.error.errors.forEach(e => errs[e.path[0] as string] = e.message);
        setErrors(errs);
        toast.error("Veuillez corriger les erreurs");
        return;
      }
      setErrors({});
    }
    setStep(s => Math.min(s + 1, 5));
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo(0, 0);
  };

  const pollDeployUntilReady = async (jobId: string, store: StoreType, startedAt: number) => {
    let currentStatus = "pending";
    let finalUrl = "";
    const PROCESS_DEADLINE_MS = 5 * 60 * 1000;
    while (Date.now() - startedAt < PROCESS_DEADLINE_MS) {
      await new Promise(r => setTimeout(r, 2500));
      const statusRes = await deployApi.status(jobId);
      currentStatus = statusRes.status;
      if (currentStatus === "pending") {
        setGenStep(3);
        setGenMessage("Job créé. En attente du worker...");
      }
      if (currentStatus === "generating") {
        setGenStep(3);
        setGenMessage("L'IA génère la structure HTML/CSS...");
        if (statusRes.warning) {
          setGenMessage("Mode dégradé: template statique utilisé pendant la génération.");
        }
      }
      if (currentStatus === "deploying") {
        setGenStep(4);
        setGenMessage("Déploiement sur l'infrastructure cloud...");
      }
      if (currentStatus === "error") {
        clearPendingDeploy();
        throw new Error(statusRes.error || "Échec du déploiement");
      }
      if (currentStatus === "ready") {
        finalUrl = statusRes.url || "";
        if (statusRes.warning) {
          toast.warning("L'IA n'était pas disponible: un template statique a été publié.");
        }
        break;
      }
    }
    if (currentStatus !== "ready") {
      clearPendingDeploy();
      throw new Error("Timeout global 5 minutes atteint. Le job est probablement bloqué côté backend.");
    }
    const updatedStore = {
      ...store,
      published_url: finalUrl || `https://${store.slug}.storegen.shop`,
    };
    setResultStore(updatedStore as any);
    setGenStep(5);
    setGenMessage("Boutique publiée avec succès.");
    localStorage.removeItem("store_wizard_draft");
    clearPendingDeploy();
    toast.success("Boutique créée avec succès !");
  };

  const handleResumeDeploy = async () => {
    if (!pendingDeploy) return;
    setIsGenerating(true);
    setGenStep(3);
    setGenMessage("Reprise du déploiement en cours...");
    try {
      const store = await storesApi.getOne(pendingDeploy.storeId);
      setResultStore(store);
      await pollDeployUntilReady(pendingDeploy.jobId, store, Date.now());
    } catch (err: any) {
      setIsGenerating(false);
      clearPendingDeploy();
      const detail = err?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : err?.message ?? "Reprise du déploiement impossible");
    }
  };

  const handleGenerate = async () => {
    clearPendingDeploy();
    setIsGenerating(true);
    setGenStep(1);
    setGenMessage("Création de la boutique dans la base de données...");

    try {
      const startTime = Date.now();
      const withTimeout = async <T,>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> => {
        return await Promise.race([
          promise,
          new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), timeoutMs)),
        ]);
      };

      const storePayload: StoreInsert = {
        name: data.name,
        slug: slugify(data.name),
        description: data.description,
        whatsapp_phone: data.whatsapp_phone,
        category: data.category,
        logo_url: isBlobUrl(data.logo_url) ? undefined : data.logo_url || undefined,
        primary_color: data.primary_color,
        font_family: data.font_family,
        theme: data.theme,
        animation_style: data.animation_style,
        status: "draft",
        owner_id: "",
      };

      let store = await withTimeout(
        storesApi.create(storePayload),
        90_000,
        "La création de la boutique dépasse 90 secondes. Vérifiez la connexion API/Supabase.",
      );
      setResultStore(store);

      if (logoFile) {
        setGenStep(2);
        setGenMessage("Boutique crÃ©Ã©e. Upload du logo...");
        const uploadedLogo = await withTimeout(
          uploadApi.logo(logoFile, store.id),
          60_000,
          "L'upload du logo prend trop de temps. RÃ©essayez.",
        );
        store = await withTimeout(
          storesApi.update(store.id, { logo_url: uploadedLogo.url }),
          60_000,
          "La mise Ã  jour du logo a expirÃ©.",
        );
        setResultStore(store);
      }

      setGenStep(2);
      setGenMessage("Boutique créée. Enregistrement des produits...");

      if (data.products.length > 0) {
        await withTimeout(
          Promise.all(
            data.products.map(async (product, index) => {
              const { pending_image_file, images, id, ...productPayload } = product as any;
              let uploadedImages = Array.isArray(images)
                ? images.filter(
                    (image: any) =>
                      image?.url &&
                      !isBlobUrl(image.url) &&
                      !String(image.public_id ?? "").startsWith("local:")
                  )
                : [];

              if (pending_image_file) {
                const uploadedImage = await uploadApi.image(pending_image_file, store.id);
                uploadedImages = [{
                  url: uploadedImage.url,
                  public_id: uploadedImage.public_id,
                  width: uploadedImage.width,
                  height: uploadedImage.height,
                }];
              }

              return productsApi.create({
                ...productPayload,
                store_id: store.id,
                position: index,
                images: uploadedImages,
              });
            })
          ),
          90_000,
          "L'enregistrement des produits est trop long. Réessayez.",
        );
      }

      setGenStep(3);
      setGenMessage("Génération IA en cours...");

      const { job_id } = await deployApi.start(store.id);
      localStorage.setItem(PENDING_DEPLOY_KEY, JSON.stringify({ jobId: job_id, storeId: store.id }));
      setPendingDeploy({ jobId: job_id, storeId: store.id });
      await pollDeployUntilReady(job_id, store, startTime);

    } catch (err: any) {
      console.error("[handleGenerate]", err);
      setIsGenerating(false);
      setGenStep(0);

      const status = err?.response?.status;
      const detail = err?.response?.data?.detail;

      if (typeof detail === "string" && detail.includes("Job introuvable")) {
        clearPendingDeploy();
      }

      if (err?.message && (
        err.message.includes("Échec du déploiement") ||
        err.message.includes("Timeout global") ||
        err.message.includes("Configuration GitHub") ||
        err.message.includes("Configuration Vercel")
      )) {
        clearPendingDeploy();
      }

      if (err?.code === "ECONNABORTED") {
        toast.error("La requête a expiré. Vérifiez que l'API FastAPI et Supabase répondent correctement.");
        return;
      }

      if (status === 504) {
        toast.error("Le serveur a dépassé son délai d'attente en base de données. Vérifiez Supabase.");
        return;
      }

      if (status === 422) {
        const code = typeof detail === "object" ? detail?.code : undefined;
        const existingStoreId = typeof detail === "object" ? detail?.existing_store_id : undefined;
        const msg = typeof detail === "object" ? detail?.message : detail;
        if (code === "STORE_QUOTA_EXCEEDED" && existingStoreId) {
          toast.error(msg ?? "Plan gratuit : 1 boutique maximum.", { duration: 5000 });
          setTimeout(() => router.push(`/dashboard/store/${existingStoreId}`), 900);
          return;
        }
        toast.error(msg ?? "Plan gratuit : 1 boutique maximum. Passez au plan Pro.", {
          duration: 6000,
        });
        return;
      }

      const fallback = typeof detail === "string"
        ? detail
        : err?.message ?? "Erreur lors de la création";
      toast.error(fallback);
    }
  };

  // ─── Renderers ─────────────────────────────────────────────────────────────

  if (genStep === 5 && resultStore) {
    const storeUrl = resultStore.published_url || `https://${resultStore.slug}.storegen.shop`;
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20">
          <CheckCircle2 className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Félicitations !</h1>
        <p className="text-gray-500 mb-8 max-w-md">
          Votre boutique <span className="font-semibold text-gray-900">{resultStore.name}</span> est maintenant en ligne et prête à recevoir des commandes.
        </p>
        
        <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm w-full max-w-sm mb-8">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Lien de votre boutique</p>
          <a 
            href={storeUrl.startsWith("http") ? storeUrl : `https://${storeUrl}`} 
            target="_blank" 
            className="text-indigo-600 font-semibold break-all hover:underline flex items-center justify-center gap-2"
          >
            {storeUrl} <Globe className="w-4 h-4" />
          </a>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <button 
            onClick={() => router.push(`/dashboard/store/${resultStore.id}`)}
            className="flex-1 bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all"
          >
            Aller au tableau de bord
          </button>
          <a 
            href={storeUrl} 
            target="_blank"
            className="flex-1 bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-500 transition-all flex items-center justify-center gap-2"
          >
            Voir ma boutique
          </a>
        </div>
      </div>
    );
  }

  if (isGenerating) {
    const steps = [
      "Initialisation du projet...",
      "Génération de la structure...",
      "Configuration du thème et du catalogue...",
      "Publication sur l'infrastructure cloud...",
      "Finalisation..."
    ];
    const progress = (genStep / 4) * 100;

    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="relative h-24 w-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
            <div className="relative bg-indigo-600 rounded-full h-24 w-24 flex items-center justify-center shadow-xl shadow-indigo-500/40">
              <Rocket className="w-10 h-10 text-white animate-bounce" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">L&apos;IA prépare votre boutique</h2>
          <p className="text-gray-500 text-center mb-2">{genMessage || "Veuillez patienter quelques instants..."}</p>
          <p className="text-xs text-gray-400 text-center mb-10">Temps écoulé: {elapsedSec}s</p>
          
          <div className="space-y-6">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
              />
            </div>
            
            <div className="space-y-3">
              {steps.map((s, i) => {
                const isActive = i + 1 === genStep;
                const isDone = i + 1 < genStep;
                return (
                  <div key={i} className={cn(
                    "flex items-center gap-3 transition-opacity duration-300",
                    isActive ? "opacity-100" : "opacity-40"
                  )}>
                    <div className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      isDone ? "bg-emerald-500 text-white" : isActive ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-400"
                    )}>
                      {isDone ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    <span className={cn("text-sm font-medium", isActive ? "text-gray-900" : "text-gray-500")}>
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
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <div className="mb-10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Créer ma boutique</h1>
            <p className="text-sm text-gray-500">Étape {step} sur 5</p>
          </div>
          <button 
            onClick={() => router.push("/dashboard")}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(s => (
            <div 
              key={s} 
              className={cn(
                "h-1.5 flex-1 rounded-full transition-all duration-500",
                s <= step ? "bg-indigo-600 shadow-sm shadow-indigo-500/20" : "bg-gray-100"
              )}
            />
          ))}
        </div>
      </div>

      {pendingDeploy && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-amber-900">Un déploiement est déjà en cours</p>
            <p className="text-xs text-amber-700">Job: {pendingDeploy.jobId.slice(0, 8)}... • Cliquez pour reprendre le suivi en temps réel.</p>
          </div>
          <button
            onClick={handleResumeDeploy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Reprendre le déploiement
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-10 shadow-xl shadow-gray-200/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {step === 1 && <Step1 data={data} setData={setData} errors={errors} />}
            {step === 2 && <Step2 data={data} setData={setData} setLogoFile={setLogoFile} />}
            {step === 3 && <Step3 data={data} setData={setData} />}
            {step === 4 && <Step4 data={data} setData={setData} />}
            {step === 5 && <Step5 data={data} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 p-4 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all",
              step === 1 ? "opacity-0 pointer-events-none" : "text-gray-500 hover:bg-gray-50"
            )}
          >
            <ChevronLeft className="w-5 h-5" /> Précédent
          </button>

          {step < 5 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
            >
              Continuer <ChevronRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !!pendingDeploy}
              className="flex items-center gap-2 bg-gray-900 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 disabled:opacity-60"
            >
              {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-amber-400" />}
              {pendingDeploy ? "Déploiement en cours" : "Générer ma boutique"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Step Components ─────────────────────────────────────────────────────────

function Step1({ data, setData, errors }: { data: WizardState; setData: any; errors: any }) {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Store className="w-5 h-5 text-indigo-600" /> Informations de base
        </h2>
        <p className="text-sm text-gray-500">Commencez par donner une identité à votre boutique.</p>
      </div>

      <div className="grid gap-6">
        <div>
          <label htmlFor="store-name" className="block text-sm font-medium text-gray-700 mb-2">Nom de la boutique</label>
          <input 
            id="store-name"
            type="text" 
            placeholder="Ex: Ma Boutique Artisanale"
            className={cn("w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all", errors.name && "border-red-400")}
            value={data.name}
            onChange={e => setData((p: any) => ({ ...p, name: e.target.value }))}
          />
          {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="store-category" className="block text-sm font-medium text-gray-700 mb-2">Catégorie</label>
          <select 
            id="store-category"
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none bg-white"
            value={data.category}
            onChange={e => setData((p: any) => ({ ...p, category: e.target.value }))}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label htmlFor="store-description" className="block text-sm font-medium text-gray-700 mb-2">Description courte</label>
          <textarea 
            id="store-description"
            placeholder="Dites-nous ce que vous vendez en quelques mots..."
            className={cn("w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all min-h-[100px]", errors.description && "border-red-400")}
            value={data.description}
            onChange={e => setData((p: any) => ({ ...p, description: e.target.value }))}
          />
          <div className="flex justify-end">
            <span className={cn("text-[10px] font-medium", data.description.length > 200 ? "text-red-500" : "text-gray-400")}>
              {data.description.length}/200
            </span>
          </div>
          {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>}
        </div>

        <div>
          <label htmlFor="store-whatsapp" className="block text-sm font-medium text-gray-700 mb-2">Numéro WhatsApp</label>
          <input 
            id="store-whatsapp"
            type="text" 
            placeholder="Ex: 0550 12 34 56"
            className={cn("w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all", errors.whatsapp_phone && "border-red-400")}
            value={data.whatsapp_phone}
            onChange={e => setData((p: any) => ({ ...p, whatsapp_phone: e.target.value }))}
          />
          <p className="mt-2 text-[11px] text-gray-400">Ce numéro sera utilisé pour recevoir vos commandes.</p>
          {errors.whatsapp_phone && <p className="mt-1 text-xs text-red-500">{errors.whatsapp_phone}</p>}
        </div>
      </div>
    </div>
  );
}

function Step2({ data, setData, setLogoFile }: { data: WizardState; setData: any; setLogoFile: (file: File | null) => void }) {
  const [uploading, setUploading] = useState(false);

  const onDrop = async (files: File[]) => {
    if (!files[0]) return;
    setUploading(true);
    try {
      const previewUrl = URL.createObjectURL(files[0]);
      setLogoFile(files[0]);
      setData((p: any) => ({ ...p, logo_url: previewUrl, logo_public_id: "local:logo" }));
      toast.success("Logo ajouté !");
    } catch (err) {
      toast.error("Échec de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Palette className="w-5 h-5 text-indigo-600" /> Identité visuelle
        </h2>
        <p className="text-sm text-gray-500">Personnalisez le look de votre marque.</p>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Logo de la boutique</label>
          <div 
            {...getRootProps()} 
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 transition-all cursor-pointer flex flex-col items-center justify-center text-center",
              isDragActive ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200 hover:border-gray-300 bg-gray-50/50",
              data.logo_url && "border-indigo-200 bg-indigo-50/20"
            )}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            ) : data.logo_url ? (
              <div className="relative group">
                <img src={data.logo_url} alt="Logo" className="h-20 w-20 object-contain rounded-lg" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 text-white" />
                </div>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-3">
                  <ImagePlus className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">Cliquez ou glissez votre logo</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG ou SVG (Max. 2MB)</p>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">Couleur de marque</label>
          <div className="flex flex-wrap gap-3">
            {COLORS.map(c => (
              <button
                key={c.value}
                onClick={() => setData((p: any) => ({ ...p, primary_color: c.value }))}
                className={cn(
                  "w-10 h-10 rounded-full border-2 transition-all flex items-center justify-center",
                  data.primary_color === c.value ? "border-gray-900 scale-110 shadow-lg" : "border-transparent"
                )}
                style={{ backgroundColor: c.value }}
              >
                {data.primary_color === c.value && <Check className="w-5 h-5 text-white mix-blend-difference" />}
              </button>
            ))}
            <div className="relative">
              <input 
                type="color" 
                value={data.primary_color}
                onChange={e => setData((p: any) => ({ ...p, primary_color: e.target.value }))}
                className="w-10 h-10 rounded-full cursor-pointer border-2 border-transparent bg-gray-50 p-0.5 overflow-hidden"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-4">Style de police</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FONTS.map(f => (
              <button
                key={f.id}
                onClick={() => setData((p: any) => ({ ...p, font_family: f.id }))}
                className={cn(
                  "p-4 rounded-xl border-2 text-left transition-all",
                  data.font_family === f.id ? "border-indigo-600 bg-indigo-50/30" : "border-gray-100 hover:border-gray-200 bg-white"
                )}
              >
                <div className={cn("text-lg font-bold mb-1", f.class)}>Aa</div>
                <div className="text-sm font-semibold text-gray-900">{f.name}</div>
                <div className="text-xs text-gray-500">{f.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step3({ data, setData }: { data: WizardState; setData: any }) {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <LayoutGrid className="w-5 h-5 text-indigo-600" /> Thème et animations
        </h2>
        <p className="text-sm text-gray-500">Choisissez l&apos;ambiance visuelle de votre site.</p>
      </div>

      <div className="space-y-10">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-5">Modèle de boutique</label>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setData((p: any) => ({ ...p, theme: t.id }))}
                className={cn(
                  "group relative aspect-[4/3] rounded-2xl overflow-hidden border-2 transition-all",
                  data.theme === t.id ? "border-indigo-600 ring-2 ring-indigo-500/20" : "border-gray-100"
                )}
              >
                <div className={cn("absolute inset-0 transition-transform duration-500 group-hover:scale-110", t.color)} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-4 flex flex-col justify-end">
                  <div className="text-white font-bold text-sm">{t.name}</div>
                  <div className="text-white/60 text-[10px]">{t.desc}</div>
                </div>
                {data.theme === t.id && (
                  <div className="absolute top-2 right-2 bg-indigo-600 text-white rounded-full p-1 shadow-lg">
                    <Check className="w-3 h-3" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-5">Style d&apos;animations</label>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {ANIMATIONS.map(a => (
              <button
                key={a.id}
                onClick={() => setData((p: any) => ({ ...p, animation_style: a.id }))}
                className={cn(
                  "p-4 rounded-xl border-2 transition-all text-center",
                  data.animation_style === a.id ? "border-indigo-600 bg-indigo-50/30" : "border-gray-100 bg-white"
                )}
              >
                <div className="text-sm font-bold text-gray-900 mb-1">{a.name}</div>
                <div className="text-[10px] text-gray-500">{a.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Step4({ data, setData }: { data: WizardState; setData: any }) {
  const [showForm, setShowForm] = useState(false);
  const [pForm, setPForm] = useState<WizardProductDraft>({
    name: "",
    price: 0,
    description: "",
    images: [],
    status: "active"
  });
  const [uploading, setUploading] = useState(false);

  const addProduct = () => {
    if (!pForm.name || !pForm.price) return toast.error("Nom et prix requis");
    setData((prev: any) => ({
      ...prev,
      products: [...prev.products, { ...pForm, id: Math.random().toString(36).substr(2, 9) }]
    }));
    setPForm({ name: "", price: 0, description: "", images: [], status: "active" });
    setShowForm(false);
  };

  const removeProduct = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      products: prev.products.filter((p: any) => p.id !== id)
    }));
  };

  const onDrop = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setUploading(true);
    try {
      const previewUrl = URL.createObjectURL(file);
      setPForm(p => ({ 
        ...p, 
        pending_image_file: file,
        images: [{ url: previewUrl, public_id: `local:${file.name}`, width: 0, height: 0 }] as any
      }));
    } catch (err) {
      toast.error("Échec upload image");
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Package className="w-5 h-5 text-indigo-600" /> Vos premiers produits
        </h2>
        <p className="text-sm text-gray-500">Ajoutez jusqu&apos;à 5 produits pour lancer votre boutique.</p>
      </div>

      <div className="space-y-4">
        {data.products.map((p: any) => (
          <div key={p.id} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-100 group">
            <div className="w-16 h-16 bg-white rounded-lg border border-gray-200 overflow-hidden shrink-0">
              {p.images?.[0] ? (
                <img src={p.images[0].url} alt={p.name || "Produit"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <Package className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-900 truncate">{p.name}</h4>
              <p className="text-indigo-600 font-bold text-sm">{formatPrice(p.price)}</p>
            </div>
            <button 
              onClick={() => removeProduct(p.id)}
              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}

        {data.products.length < 5 && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="w-full p-6 rounded-2xl border-2 border-dashed border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center gap-2 group"
          >
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-gray-900">Ajouter un produit</span>
          </button>
        )}

        {showForm && (
          <div className="p-6 rounded-3xl bg-indigo-50/40 border border-indigo-100 space-y-4 animate-in slide-in-from-top-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div {...getRootProps()} className="aspect-square bg-white rounded-2xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 transition-all overflow-hidden relative">
                <input {...getInputProps()} />
                {uploading ? (
                  <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                ) : (pForm.images as any)?.[0] ? (
                  <img src={(pForm.images as any)[0].url} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <ImagePlus className="w-6 h-6 text-indigo-400 mb-2" />
                    <span className="text-[10px] font-medium text-indigo-400 uppercase">Ajouter photo</span>
                  </>
                )}
              </div>
              <div className="space-y-3">
                <input 
                  id="product-name"
                  placeholder="Nom du produit"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                  value={pForm.name}
                  onChange={e => setPForm(p => ({ ...p, name: e.target.value }))}
                />
                <input 
                  id="product-price"
                  type="number"
                  placeholder="Prix (DZD)"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm"
                  value={pForm.price || ""}
                  onChange={e => setPForm(p => ({ ...p, price: Number(e.target.value) }))}
                />
                <textarea 
                  id="product-description"
                  placeholder="Description..."
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500/20 outline-none text-sm min-h-[80px]"
                  value={pForm.description || ""}
                  onChange={e => setPForm(p => ({ ...p, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white text-gray-500 font-semibold text-sm border border-gray-200"
              >
                Annuler
              </button>
              <button 
                onClick={addProduct}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-500"
              >
                Confirmer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Step5({ data }: { data: WizardState }) {
  const selectedTheme = THEMES.find(t => t.id === data.theme);
  const selectedAnim = ANIMATIONS.find(a => a.id === data.animation_style);

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center sm:text-left">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center justify-center sm:justify-start gap-2">
          <Zap className="w-6 h-6 text-amber-500" /> Prêt pour le décollage ?
        </h2>
        <p className="text-sm text-gray-500">Vérifiez vos informations avant de lancer la génération IA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Identité</h4>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-lg border border-gray-100 flex items-center justify-center">
                {data.logo_url ? <img src={data.logo_url} alt="Logo" className="w-full h-full object-contain" /> : <Store className="w-6 h-6 text-gray-300" />}
              </div>
              <div>
                <p className="font-bold text-gray-900">{data.name}</p>
                <p className="text-xs text-gray-500">{data.category}</p>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Style & Thème</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Thème</span>
                <span className="text-sm font-bold text-gray-900">{selectedTheme?.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Couleur</span>
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: data.primary_color }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Animations</span>
                <span className="text-sm font-bold text-gray-900">{selectedAnim?.name}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-gray-50 border border-gray-100">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Produits ({data.products.length})</h4>
          {data.products.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucun produit ajouté pour le moment.</p>
          ) : (
            <div className="space-y-3">
              {data.products.slice(0, 3).map((p: any) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded border border-gray-100 overflow-hidden shrink-0">
                    {p.images?.[0] && <img src={p.images[0].url} alt={p.name || "Produit"} className="w-full h-full object-cover" />}
                  </div>
                  <span className="text-sm font-medium text-gray-700 truncate">{p.name}</span>
                  <span className="text-sm font-bold text-gray-900 ml-auto">{formatPrice(p.price)}</span>
                </div>
              ))}
              {data.products.length > 3 && (
                <p className="text-[10px] text-gray-400 text-center">+ {data.products.length - 3} autres produits</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
        <p className="text-xs text-amber-800 leading-relaxed">
          En cliquant sur le bouton ci-dessous, notre IA va configurer vos serveurs, déployer votre design et préparer votre catalogue. Cette opération peut prendre jusqu&apos;à 2 minutes.
        </p>
      </div>
    </div>
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
