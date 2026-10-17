"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  Lock,
  Crown,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Server,
  Save,
  Loader2,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Phone,
  Store,
  Layers,
  Sparkles,
  BarChart,
  Activity,
  Sliders,
  FileText,
  ShieldAlert,
  Truck,
  Bell,
  User,
  Trash2,
  CreditCard,
  Instagram,
  Facebook,
  Send,
  AlertTriangle,
  X,
  CheckCircle2,
  Search,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Upload,
  ImagePlus,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useUserPlan } from "@/lib/use-user-plan";
import UpgradeModal from "@/components/dashboard/UpgradeModal";
import { uploadApi, storesApi } from "@/lib/api";

const DZ_WILAYAS = [
  { id: 1, name: "01 - Adrar" },
  { id: 2, name: "02 - Chlef" },
  { id: 3, name: "03 - Laghouat" },
  { id: 4, name: "04 - Oum El Bouaghi" },
  { id: 5, name: "05 - Batna" },
  { id: 6, name: "06 - Béjaïa" },
  { id: 7, name: "07 - Biskra" },
  { id: 8, name: "08 - Béchar" },
  { id: 9, name: "09 - Blida" },
  { id: 10, name: "10 - Bouira" },
  { id: 11, name: "11 - Tamanrasset" },
  { id: 12, name: "12 - Tébessa" },
  { id: 13, name: "13 - Tlemcen" },
  { id: 14, name: "14 - Tiaret" },
  { id: 15, name: "15 - Tizi Ouzou" },
  { id: 16, name: "16 - Alger" },
  { id: 17, name: "17 - Djelfa" },
  { id: 18, name: "18 - Jijel" },
  { id: 19, name: "19 - Sétif" },
  { id: 20, name: "20 - Saïda" },
  { id: 21, name: "21 - Skikda" },
  { id: 22, name: "22 - Sidi Bel Abbès" },
  { id: 23, name: "23 - Annaba" },
  { id: 24, name: "24 - Guelma" },
  { id: 25, name: "25 - Constantine" },
  { id: 26, name: "26 - Médéa" },
  { id: 27, name: "27 - Mostaganem" },
  { id: 28, name: "28 - M'Sila" },
  { id: 29, name: "29 - Mascara" },
  { id: 30, name: "30 - Ouargla" },
  { id: 31, name: "31 - Oran" },
  { id: 32, name: "32 - El Bayadh" },
  { id: 33, name: "33 - Illizi" },
  { id: 34, name: "34 - Bordj Bou Arreridj" },
  { id: 35, name: "35 - Boumerdès" },
  { id: 36, name: "36 - El Tarf" },
  { id: 37, name: "37 - Tindouf" },
  { id: 38, name: "38 - Tissemsilt" },
  { id: 39, name: "39 - El Oued" },
  { id: 40, name: "40 - Khenchela" },
  { id: 41, name: "41 - Souk Ahras" },
  { id: 42, name: "42 - Tipaza" },
  { id: 43, name: "43 - Mila" },
  { id: 44, name: "44 - Aïn Defla" },
  { id: 45, name: "45 - Naâma" },
  { id: 46, name: "46 - Aïn Témouchent" },
  { id: 47, name: "47 - Ghardaïa" },
  { id: 48, name: "48 - Relizane" },
  { id: 49, name: "49 - Timimoun" },
  { id: 50, name: "50 - Bordj Badji Mokhtar" },
  { id: 51, name: "51 - Ouled Djellal" },
  { id: 52, name: "52 - Béni Abbès" },
  { id: 53, name: "53 - In Salah" },
  { id: 54, name: "54 - In Guezzam" },
  { id: 55, name: "55 - Touggourt" },
  { id: 56, name: "56 - Djanet" },
  { id: 57, name: "57 - El M'Ghair" },
  { id: 58, name: "58 - El Meniaa" },
];

type SettingsTab =
  | "pixels-domain"
  | "contact-slip"
  | "cod-security"
  | "carrier-notifications"
  | "account-billing";

interface StoreSettingsData {
  id: string;
  name: string;
  slug: string;
  type: string;
  logo_url?: string | null;
  custom_domain?: string | null;
  whatsapp_phone?: string | null;
  facebook_pixel_id?: string | null;
  tiktok_pixel_id?: string | null;
  google_analytics_id?: string | null;
  published_url?: string | null;
  settings?: {
    instagram_url?: string | null;
    facebook_page_url?: string | null;
    shipping_slip?: {
      sender_name?: string | null;
      customer_service_phone?: string | null;
      default_wilaya_id?: number | null;
      footer_note?: string | null;
    } | null;
    security?: {
      strict_dz_phone?: boolean;
      anti_spam_orders?: boolean;
      blacklist?: string[];
    } | null;
    carrier?: {
      provider?: string | null;
      api_id?: string | null;
      api_token?: string | null;
    } | null;
    notifications?: {
      email_alerts?: boolean;
      telegram_chat_id?: string | null;
    } | null;
    manual_shipping?: {
      price_home?: number;
      price_desk?: number;
      is_free?: boolean;
      custom_wilayas?: Record<number, { price_home?: number; price_desk?: number }>;
      updated_at?: string;
    } | null;
  } | null;
}

function SettingsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = getSupabaseBrowserClient();
  const userPlan = useUserPlan();

  const urlStoreParam = searchParams.get("store") || searchParams.get("store_id");

  const [stores, setStores] = useState<StoreSettingsData[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>(urlStoreParam || "");
  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const validTabs: SettingsTab[] = [
    "pixels-domain",
    "contact-slip",
    "cod-security",
    "carrier-notifications",
    "account-billing",
  ];

  const [activeTab, setActiveTab] = useState<SettingsTab>(() => {
    if (tabParam && validTabs.includes(tabParam)) return tabParam;
    return "pixels-domain";
  });

  useEffect(() => {
    if (tabParam && validTabs.includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeType, setUpgradeType] = useState<
    "domain" | "pixels" | "carrier" | "stores" | "team"
  >("domain");

  // Form Fields State
  // Tab 1: Pixels & Domain
  const [logoUrl, setLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [fbPixelId, setFbPixelId] = useState("");
  const [tiktokPixelId, setTiktokPixelId] = useState("");
  const [googleAnalyticsId, setGoogleAnalyticsId] = useState("");

  // Tab 2: Contact & Slip
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookPageUrl, setFacebookPageUrl] = useState("");
  const [senderName, setSenderName] = useState("");
  const [servicePhone, setServicePhone] = useState("");
  const [defaultWilayaId, setDefaultWilayaId] = useState<number>(16);
  const [footerNote, setFooterNote] = useState("Merci pour votre confiance !");

  // Tab 3: COD Security
  const [strictDzPhone, setStrictDzPhone] = useState(true);
  const [antiSpamOrders, setAntiSpamOrders] = useState(true);
  const [blacklistInput, setBlacklistInput] = useState("");

  // Tab 4: Carrier & Notifications
  const [carrierProvider, setCarrierProvider] = useState("yalidine");
  const [carrierApiId, setCarrierApiId] = useState("");
  const [carrierApiToken, setCarrierApiToken] = useState("");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [telegramChatId, setTelegramChatId] = useState("");

  // Tab 4 (suite): Tarifs Manuels de Livraison (Sans Transporteur Connecté)
  const [manualPriceHome, setManualPriceHome] = useState<number>(600);
  const [manualPriceDesk, setManualPriceDesk] = useState<number>(350);
  const [isFreeShipping, setIsFreeShipping] = useState<boolean>(false);
  const [customWilayasShipping, setCustomWilayasShipping] = useState<
    Record<number, { price_home?: number; price_desk?: number }>
  >({});
  const [showWilayaDetails, setShowWilayaDetails] = useState<boolean>(false);
  const [wilayaSearch, setWilayaSearch] = useState<string>("");
  const [applyingShippingToAll, setApplyingShippingToAll] = useState<boolean>(false);

  // Tab 5: Danger Zone Deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [isDeletingStore, setIsDeletingStore] = useState(false);

  const [copiedUrl, setCopiedUrl] = useState(false);

  // 1. Load Stores
  const loadStores = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      const list = ((data ?? []) as unknown as StoreSettingsData[]) || [];
      setStores(list);

      // Determine initial store ID
      let initialId = "";
      if (urlStoreParam && list.some((s) => s.id === urlStoreParam)) {
        initialId = urlStoreParam;
      } else if (list.length > 0 && list[0]) {
        initialId = list[0].id;
      }

      if (initialId) {
        setSelectedStoreId(initialId);
        populateFields(list.find((s) => s.id === initialId)!);
      }
    } catch (err) {
      console.warn("Could not load store settings:", err);
    } finally {
      setLoading(false);
    }
  }, [user, supabase, urlStoreParam]);

  useEffect(() => {
    loadStores();
  }, [loadStores]);

  // Populate fields from store object
  const populateFields = (store: StoreSettingsData) => {
    const s = store.settings || {};
    setLogoUrl(store.logo_url || "");
    setCustomDomain(store.custom_domain || "");
    setFbPixelId(store.facebook_pixel_id || "");
    setTiktokPixelId(store.tiktok_pixel_id || "");
    setGoogleAnalyticsId(store.google_analytics_id || "");

    setWhatsappPhone(store.whatsapp_phone || "");
    setInstagramUrl(s.instagram_url || "");
    setFacebookPageUrl(s.facebook_page_url || "");

    setSenderName(s.shipping_slip?.sender_name || store.name || "");
    setServicePhone(s.shipping_slip?.customer_service_phone || store.whatsapp_phone || "");
    setDefaultWilayaId(s.shipping_slip?.default_wilaya_id || 16);
    setFooterNote(s.shipping_slip?.footer_note || "Merci pour votre confiance !");

    setStrictDzPhone(s.security?.strict_dz_phone ?? true);
    setAntiSpamOrders(s.security?.anti_spam_orders ?? true);
    setBlacklistInput((s.security?.blacklist || []).join("\n"));

    setCarrierProvider(s.carrier?.provider || "yalidine");
    setCarrierApiId(s.carrier?.api_id || "");
    setCarrierApiToken(s.carrier?.api_token || "");

    const manualShip = s.manual_shipping || {};
    setManualPriceHome(manualShip.price_home !== undefined ? manualShip.price_home : 600);
    setManualPriceDesk(manualShip.price_desk !== undefined ? manualShip.price_desk : 350);
    setIsFreeShipping(Boolean(manualShip.is_free));
    setCustomWilayasShipping(manualShip.custom_wilayas || {});

    setEmailAlerts(s.notifications?.email_alerts ?? true);
    setTelegramChatId(s.notifications?.telegram_chat_id || "");
  };

  const handleStoreSelect = (storeId: string) => {
    setSelectedStoreId(storeId);
    const found = stores.find((s) => s.id === storeId);
    if (found) {
      populateFields(found);
    }
  };

  const currentStore = stores.find((s) => s.id === selectedStoreId) || stores[0] || null;

  const subDomainUrl = currentStore?.slug
    ? `https://${currentStore.slug}.easytradez.site`
    : "";

  const handleCopyLink = () => {
    if (!subDomainUrl) return;
    navigator.clipboard.writeText(subDomainUrl);
    setCopiedUrl(true);
    toast.success("Lien de la boutique copié !");
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentStore) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner un fichier image valide (PNG, JPG, WebP, SVG)");
      return;
    }

    setUploadingLogo(true);
    try {
      const res = await uploadApi.logo(file, currentStore.id);
      if (res?.url) {
        await storesApi.update(currentStore.id, { logo_url: res.url });
        setLogoUrl(res.url);
        setStores((prev) =>
          prev.map((s) => (s.id === currentStore.id ? { ...s, logo_url: res.url } : s))
        );
        toast.success("Logo de la marque enregistré avec succès !");
      }
    } catch (err: any) {
      console.error("Erreur upload logo:", err);
      toast.error(err.message || "Erreur lors de l'enregistrement du logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentStore) return;
    setUploadingLogo(true);
    try {
      await storesApi.update(currentStore.id, { logo_url: null });
      setLogoUrl("");
      setStores((prev) =>
        prev.map((s) => (s.id === currentStore.id ? { ...s, logo_url: null } : s))
      );
      toast.success("Logo supprimé de la boutique");
    } catch (err: any) {
      toast.error("Erreur lors de la suppression du logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Generic Save Handler for Settings
  const handleSaveAll = async (tabName: string) => {
    if (!currentStore) return;

    // Gating checks
    if (!userPlan.canUseCustomDomain && customDomain.trim()) {
      setUpgradeType("domain");
      setShowUpgradeModal(true);
      return;
    }

    if (userPlan.isFree && (tiktokPixelId.trim() || googleAnalyticsId.trim())) {
      setUpgradeType("pixels");
      setShowUpgradeModal(true);
      return;
    }

    if (userPlan.isFree && (carrierApiId.trim() || carrierApiToken.trim())) {
      setUpgradeType("carrier");
      setShowUpgradeModal(true);
      return;
    }

    setSaving(true);
    try {
      const cleanDomain = customDomain
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "");

      const blacklistArr = blacklistInput
        .split(/[\n,]+/)
        .map((s) => s.trim())
        .filter(Boolean);

      const updatedSettings = {
        ...(currentStore.settings || {}),
        instagram_url: instagramUrl.trim() || null,
        facebook_page_url: facebookPageUrl.trim() || null,
        shipping_slip: {
          sender_name: senderName.trim(),
          customer_service_phone: servicePhone.trim(),
          default_wilaya_id: defaultWilayaId,
          footer_note: footerNote.trim(),
        },
        security: {
          strict_dz_phone: strictDzPhone,
          anti_spam_orders: antiSpamOrders,
          blacklist: blacklistArr,
        },
        carrier: {
          provider: carrierProvider,
          api_id: carrierApiId.trim(),
          api_token: carrierApiToken.trim(),
        },
        manual_shipping: {
          price_home: isFreeShipping ? 0 : Number(manualPriceHome) || 0,
          price_desk: isFreeShipping ? 0 : Number(manualPriceDesk) || 0,
          is_free: isFreeShipping,
          custom_wilayas: customWilayasShipping,
          updated_at: new Date().toISOString(),
        },
        notifications: {
          email_alerts: emailAlerts,
          telegram_chat_id: telegramChatId.trim(),
        },
      };

      const payload = {
        custom_domain: cleanDomain || null,
        whatsapp_phone: whatsappPhone.trim() || null,
        facebook_pixel_id: fbPixelId.trim() || null,
        tiktok_pixel_id: tiktokPixelId.trim() || null,
        google_analytics_id: googleAnalyticsId.trim() || null,
        settings: updatedSettings,
      };

      const res = await fetch(`/api/stores/${currentStore.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (resData.code === "PLAN_LIMIT_REACHED" || res.status === 403) {
          const ltype = resData.limit_type || "domain";
          setUpgradeType(ltype);
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(resData.detail || "Erreur lors de la sauvegarde");
      }

      setStores((prev) =>
        prev.map((s) => (s.id === currentStore.id ? { ...s, ...payload } : s))
      );
      toast.success(`Paramètres « ${tabName} » enregistrés avec succès !`);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  // Helper Tarifs Manuels
  const GRAND_SUD_WILAYAS = [1, 8, 11, 30, 33, 37, 39, 47, 49, 50, 51, 53, 54, 55, 56, 57, 58];

  const handleApplyGrandSudPreset = () => {
    const updated = { ...customWilayasShipping };
    const baseHome = isFreeShipping ? 0 : Number(manualPriceHome) || 600;
    const baseDesk = isFreeShipping ? 0 : Number(manualPriceDesk) || 350;
    GRAND_SUD_WILAYAS.forEach((wid) => {
      updated[wid] = {
        price_home: baseHome + 300,
        price_desk: baseDesk + 200,
      };
    });
    setCustomWilayasShipping(updated);
    toast.info("Tarifs Grand Sud ajustés (+300 DA Domicile, +200 DA Bureau) !");
  };

  const handleResetCustomWilaya = (wilayaId: number) => {
    const updated = { ...customWilayasShipping };
    delete updated[wilayaId];
    setCustomWilayasShipping(updated);
  };

  const handleResetAllCustomWilayas = () => {
    setCustomWilayasShipping({});
    toast.info("Tous les tarifs spécifiques ont été réinitialisés au tarif standard.");
  };

  const filteredWilayas = useMemo(() => {
    const q = wilayaSearch.trim().toLowerCase();
    if (!q) return DZ_WILAYAS;
    return DZ_WILAYAS.filter(
      (w) => w.name.toLowerCase().includes(q) || String(w.id).includes(q)
    );
  }, [wilayaSearch]);

  const customWilayasCount = Object.keys(customWilayasShipping).length;

  const handleApplyShippingToAllStores = async () => {
    setApplyingShippingToAll(true);
    try {
      const payload = {
        price_home: isFreeShipping ? 0 : Number(manualPriceHome) || 0,
        price_desk: isFreeShipping ? 0 : Number(manualPriceDesk) || 0,
        is_free: isFreeShipping,
        custom_wilayas: customWilayasShipping,
      };

      const res = await fetch("/api/shipping-rates/apply-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.detail || "Erreur lors de l'application des tarifs");
      }

      // Sync local stores state
      setStores((prev) =>
        prev.map((s) => ({
          ...s,
          settings: {
            ...(s.settings || {}),
            manual_shipping: {
              ...payload,
              updated_at: new Date().toISOString(),
            },
          },
        }))
      );

      toast.success(
        data.message ||
          "Tarifs de livraison appliqués avec succès à tous vos funnels et boutiques !"
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'application des tarifs");
    } finally {
      setApplyingShippingToAll(false);
    }
  };

  // Delete Store Handler
  const handleDeleteStore = async () => {
    if (!currentStore) return;
    if (deleteConfirmationName.trim() !== currentStore.name.trim()) {
      toast.error("Le nom saisi ne correspond pas.");
      return;
    }

    setIsDeletingStore(true);
    try {
      const res = await fetch(`/api/stores/${currentStore.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Erreur de suppression");
      }

      toast.success(`« ${currentStore.name} » a été supprimée définitivement.`);
      setShowDeleteModal(false);
      router.push(`/dashboard/${currentStore.type === "funnel" ? "funnel" : "boutique"}`);
    } catch (err: any) {
      toast.error(err.message || "Impossible de supprimer ce projet");
    } finally {
      setIsDeletingStore(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (stores.length === 0) {
    return (
      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0c0d1c] p-12 text-center max-w-lg mx-auto space-y-4">
        <Store className="w-12 h-12 text-slate-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Aucune boutique trouvée
        </h2>
        <p className="text-xs text-slate-500 dark:text-white/60">
          Créez d&apos;abord votre première vitrine ou funnel pour configurer ses paramètres.
        </p>
        <Link
          href="/dashboard/boutique/create"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-md transition-all"
        >
          <span>Créer une boutique</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const TABS = [
    {
      id: "pixels-domain" as const,
      label: "Pixels & Domaine",
      icon: Globe,
      desc: "Facebook, TikTok, Analytics & URL",
    },
    {
      id: "contact-slip" as const,
      label: "Coordonnées & Bordereau",
      icon: FileText,
      desc: "WhatsApp, réseaux & ticket colis",
    },
    {
      id: "cod-security" as const,
      label: "Sécurité COD & Anti-Fake",
      icon: ShieldAlert,
      desc: "Protection spam DZ & Blacklist",
    },
    {
      id: "carrier-notifications" as const,
      label: "Transporteurs & Notifications",
      icon: Truck,
      desc: "Yalidine, ZR Express & Alertes",
    },
    {
      id: "account-billing" as const,
      label: "Mon Compte & Abonnement",
      icon: CreditCard,
      desc: "Plan, profil & zone de danger",
    },
  ];

  const currentTabObj = TABS.find((t) => t.id === activeTab) || TABS[0]!;
  const CurrentTabIcon = currentTabObj.icon;

  return (
    <div className="space-y-7 pb-20 max-w-5xl">
      {/* ── En-tête & Sélecteur de Boutique ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Paramètres
            </h1>
          </div>
          <p className="text-slate-500 dark:text-white/60 text-xs sm:text-sm mt-1">
            Pilotez votre infrastructure de vente, vos pixels de conversion et votre logistique.
          </p>
        </div>

        {stores.length > 1 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-semibold text-slate-400">Projet actif :</span>
            <select
              value={selectedStoreId}
              onChange={(e) => handleStoreSelect(e.target.value)}
              className="bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-900 dark:text-white focus:border-accent outline-none shadow-sm"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type === "funnel" ? "Funnel" : "Boutique"})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── En-tête de Section Active (Piloté par le sous-menu latéral) ────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent/10 dark:bg-accent/20 border border-accent/25 dark:border-sky/30 flex items-center justify-center text-accent dark:text-sky shrink-0 shadow-xs">
            <CurrentTabIcon className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-white/40">
                Paramètres
              </span>
              <span className="text-slate-300 dark:text-white/20">/</span>
              <span className="text-xs font-extrabold text-accent dark:text-sky">
                {currentTabObj.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-white/60 font-medium mt-0.5">
              {currentTabObj.desc}
            </p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 1 : Pixels & Domaine
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "pixels-domain" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Sous-domaine actif */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-4 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Sous-Domaine Gratuit Inclus
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Accessible instantanément avec certificat SSL Let&apos;s Encrypt.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-white/80 bg-slate-50 dark:bg-white/10 border border-slate-200 dark:border-white/10 hover:bg-slate-100 transition-all shadow-sm"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? "Copié" : "Copier"}</span>
                </button>
                <a
                  href={subDomainUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-accent hover:bg-accent/90 shadow-sm transition-all"
                >
                  <span>Ouvrir</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 font-mono text-xs text-slate-800 dark:text-white/80">
              {subDomainUrl}
            </div>
          </div>

          {/* Logo de la Marque & Favicon Onglet Client */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <ImagePlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Logo Officiel de la Marque & Favicon
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    S&apos;affiche dans l&apos;en-tête de votre boutique ou funnel et remplace le logo EasyTradez dans l&apos;onglet du navigateur.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
              {/* Preview container */}
              <div className="relative w-28 h-28 rounded-2xl bg-white dark:bg-[#050611] border-2 border-dashed border-slate-200 dark:border-white/15 flex items-center justify-center p-2.5 overflow-hidden shadow-inner shrink-0 group">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoUrl}
                    alt={currentStore?.name || "Logo"}
                    className="w-full h-full object-contain transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="text-center p-2">
                    <span className="text-2xl block mb-1">🏷️</span>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase tracking-wider block">
                      Sans Logo
                    </span>
                  </div>
                )}
                {uploadingLogo && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin text-accent" />
                  </div>
                )}
              </div>

              {/* Upload actions and recommendations */}
              <div className="flex-1 text-center sm:text-left space-y-2">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    {logoUrl ? "Logo de marque actif" : "Personnalisez votre boutique avec votre propre logo"}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-white/50 mt-0.5">
                    Format recommandé : PNG transparent, SVG ou WebP (min. 200×200 px). Apparaît automatiquement sur votre site public et en favicon.
                  </p>
                </div>

                <div className="flex items-center gap-2.5 justify-center sm:justify-start pt-1">
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-accent hover:bg-accent/90 shadow-sm transition-all cursor-pointer active:scale-95">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{logoUrl ? "Changer le logo" : "Importer un logo"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                      className="hidden"
                    />
                  </label>

                  {logoUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Supprimer</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tracking Publicitaire (Pixels) */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 flex items-center justify-center shrink-0">
                  <BarChart className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Tracking Publicitaire (Pixels de Conversion)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Événements ViewContent, AddToCart et Purchase transmis automatiquement.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              {/* Facebook Pixel (Autorisé en Free) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                    <Facebook className="w-3.5 h-3.5 text-blue-600" />
                    <span>Facebook / Meta Pixel</span>
                  </label>
                  <span className="text-[10px] font-bold text-emerald-500">Inclus Free</span>
                </div>
                <input
                  type="text"
                  value={fbPixelId}
                  onChange={(e) => setFbPixelId(e.target.value)}
                  placeholder="Ex: 123456789012345"
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                />
              </div>

              {/* TikTok Pixel (Badge PRO) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-500" />
                    <span>TikTok Pixel</span>
                  </label>
                  {userPlan.isFree ? (
                    <span
                      onClick={() => {
                        setUpgradeType("pixels");
                        setShowUpgradeModal(true);
                      }}
                      className="cursor-pointer inline-flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-500">Actif Pro</span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={tiktokPixelId}
                    onChange={(e) => {
                      if (userPlan.isFree) {
                        setUpgradeType("pixels");
                        setShowUpgradeModal(true);
                        return;
                      }
                      setTiktokPixelId(e.target.value);
                    }}
                    placeholder="Ex: C123456789ABCDEF"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                  />
                </div>
              </div>

              {/* Google Analytics (Badge PRO) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-white/80 flex items-center gap-1.5">
                    <BarChart className="w-3.5 h-3.5 text-amber-500" />
                    <span>Google Analytics</span>
                  </label>
                  {userPlan.isFree ? (
                    <span
                      onClick={() => {
                        setUpgradeType("pixels");
                        setShowUpgradeModal(true);
                      }}
                      className="cursor-pointer inline-flex items-center gap-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-slate-950"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-emerald-500">Actif Pro</span>
                  )}
                </div>
                <input
                  type="text"
                  value={googleAnalyticsId}
                  onChange={(e) => {
                    if (userPlan.isFree) {
                      setUpgradeType("pixels");
                      setShowUpgradeModal(true);
                      return;
                    }
                    setGoogleAnalyticsId(e.target.value);
                  }}
                  placeholder="Ex: G-XXXXXXXXXX"
                  className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Domaine Personnalisé (.com / .dz) */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Nom de Domaine Personnalisé (.com, .dz, .shop)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Renforcez la marque et l&apos;autorité de votre boutique auprès de vos clients.
                  </p>
                </div>
              </div>

              {!userPlan.canUseCustomDomain && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                  <Crown className="w-3 h-3" />
                  Pack Pro
                </span>
              )}
            </div>

            {!userPlan.canUseCustomDomain ? (
              <div className="rounded-2xl border-2 border-dashed border-amber-500/30 bg-amber-500/[0.02] p-6 text-center space-y-3">
                <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Connectez votre propre marque avec le Pack Pro
                </h4>
                <p className="text-xs text-slate-500 dark:text-white/60 max-w-md mx-auto">
                  Débloquez l&apos;utilisation d&apos;un domaine .dz ou .com avec routage automatique et certificat SSL Let&apos;s Encrypt.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeType("domain");
                    setShowUpgradeModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/20 active:scale-95 transition-all"
                >
                  <Crown className="w-4 h-4" />
                  <span>Débloquer avec le Pack Pro</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                    Adresse de votre nom de domaine
                  </label>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="www.maboutique.dz ou shop.maboutique.com"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                  />
                </div>

                <div className="rounded-xl border border-slate-200/80 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-4 text-xs space-y-2">
                  <p className="font-bold text-slate-800 dark:text-white/90">
                    Configuration DNS requise chez votre Registrar (.dz / Namecheap / Hostinger) :
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-[11px]">
                      <thead>
                        <tr className="text-slate-400 uppercase text-[10px]">
                          <th className="py-1">Type</th>
                          <th className="py-1">Hôte</th>
                          <th className="py-1">Valeur CNAME</th>
                          <th className="py-1">TTL</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="font-bold text-accent py-1">CNAME</td>
                          <td className="py-1">www</td>
                          <td className="font-bold text-slate-900 dark:text-white py-1">cname.easytradez.site</td>
                          <td className="py-1 text-slate-400">3600 (Auto)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleSaveAll("Pixels & Domaine")}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/20 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Enregistrer les modifications</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 2 : Coordonnées & Bordereau
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "contact-slip" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Coordonnées de contact */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Coordonnées de Commande & Réseaux Sociaux
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Liens affichés sur votre page de confirmation et dans le pied de page de la boutique.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Numéro WhatsApp de commande</span>
                </label>
                <input
                  type="tel"
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="0550123456"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5 flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-pink-500" />
                  <span>Lien Page Instagram</span>
                </label>
                <input
                  type="url"
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/maboutique"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5 flex items-center gap-1.5">
                  <Facebook className="w-3.5 h-3.5 text-blue-600" />
                  <span>Lien Page Facebook</span>
                </label>
                <input
                  type="url"
                  value={facebookPageUrl}
                  onChange={(e) => setFacebookPageUrl(e.target.value)}
                  placeholder="https://facebook.com/maboutique"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                />
              </div>
            </div>
          </div>

          {/* Configuration Bordereau d'expédition (ShippingSlipModal) */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Bordereau d&apos;Expédition & Étiquette Colis
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Informations imprimées sur les bordereaux de livraison A4/A6 remis aux livreurs.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                  Nom de l&apos;Expéditeur (Boutique / Raison sociale)
                </label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="Ex: Boutique Élégance DZ"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                  Téléphone du Service Client (Sur le ticket)
                </label>
                <input
                  type="tel"
                  value={servicePhone}
                  onChange={(e) => setServicePhone(e.target.value)}
                  placeholder="Ex: 0550123456"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                  Wilaya d&apos;expédition par défaut
                </label>
                <select
                  value={defaultWilayaId}
                  onChange={(e) => setDefaultWilayaId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                >
                  {DZ_WILAYAS.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                  Mention personnalisée en bas de ticket
                </label>
                <input
                  type="text"
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  placeholder="Ex: Merci pour votre confiance !"
                  className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleSaveAll("Coordonnées & Bordereau")}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/20 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Enregistrer les coordonnées</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 3 : Sécurité COD & Anti-Fake Orders
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "cod-security" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Sécurité Anti-Fake Orders & Filtrage Algérie
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Protégez votre trésorerie contre les faux numéros, paniers robots et retours abusifs.
                </p>
              </div>
            </div>

            {/* Switchs de sécurité */}
            <div className="space-y-4 pt-2">
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Validation stricte des numéros algériens (10 chiffres : 05, 06, 07)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-white/50 mt-1 max-w-xl">
                    Bloque immédiatement toute commande saisissant un numéro fixe, incomplet ou ne correspondant pas aux opérateurs mobiles algériens (Ooredoo, Mobilis, Djezzy).
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={strictDzPhone}
                    onChange={(e) => setStrictDzPhone(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Protection Anti-Spam commandes multiples (24h)
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-white/50 mt-1 max-w-xl">
                    Limite automatiquement le nombre de commandes passées avec la même adresse IP ou le même numéro de téléphone à 2 commandes par jour pour éviter le blocage de stock.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={antiSpamOrders}
                    onChange={(e) => setAntiSpamOrders(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>
            </div>

            {/* Liste Noire (Blacklist) */}
            <div className="space-y-2 pt-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-white/80">
                Liste Noire Téléphonique (Numéros indésirables / Faux clients)
              </label>
              <p className="text-[11px] text-slate-400 dark:text-white/40">
                Saisissez un numéro par ligne. Ces clients recevront une erreur lors de la confirmation sans que la commande ne soit enregistrée.
              </p>
              <textarea
                rows={4}
                value={blacklistInput}
                onChange={(e) => setBlacklistInput(e.target.value)}
                placeholder={"0550000000\n0660000000\n0770000000"}
                className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleSaveAll("Sécurité COD")}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/20 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Enregistrer la sécurité</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 4 : Transporteurs & Notifications
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "carrier-notifications" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* CARTE 1 : Tarifs Manuels de Livraison (Sans Transporteur Connecté) */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-6 shadow-sm relative overflow-hidden">
            {/* Ambient subtle glow */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 shadow-inner">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      Tarifs de Livraison Manuels
                    </h3>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Sans transporteur API
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-white/50 mt-0.5">
                    Fixez vos frais de livraison à domicile et en bureau. Appliquez-les en 1 clic sur toutes vos boutiques et funnels.
                  </p>
                </div>
              </div>

              {/* Status Indicator */}
              <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10">
                  <Layers className="w-3.5 h-3.5 text-accent" />
                  <span>{stores.length} boutique{stores.length > 1 ? "s" : ""} &amp; funnel{stores.length > 1 ? "s" : ""}</span>
                </span>
              </div>
            </div>

            {/* Switch Livraison Gratuite */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/[0.06] via-teal-500/[0.04] to-transparent border border-emerald-500/20 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Livraison 100% Gratuite (Offerte sur toute l&apos;Algérie)
                  </span>
                  {isFreeShipping && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950">
                      Offerte active
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Active la livraison à 0 DA sur tous vos formulaires COD pour maximiser le taux de conversion.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={isFreeShipping}
                  onChange={(e) => setIsFreeShipping(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
              </label>
            </div>

            {/* Tarifs Standards : Domicile & Stop Desk */}
            {!isFreeShipping && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                {/* Domicile */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-emerald-400" />
                      <span>Tarif Livraison à Domicile</span>
                    </label>
                    <span className="text-[11px] font-medium text-slate-400">Toutes wilayas</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={manualPriceHome}
                      onChange={(e) => setManualPriceHome(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="600"
                      className="w-full px-3.5 py-2.5 pr-14 text-sm font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080914] text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-white/40">
                      DA
                    </span>
                  </div>
                  {/* Quick preset buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 dark:text-white/40 mr-1">Raccourcis :</span>
                    {[0, 400, 500, 600, 750, 900].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setManualPriceHome(val)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          manualPriceHome === val
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : "bg-white dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:border-emerald-500/30"
                        }`}
                      >
                        {val === 0 ? "Gratuit" : `${val} DA`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stop Desk / Bureau */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Store className="w-4 h-4 text-sky-400" />
                      <span>Tarif Livraison en Bureau (Stop Desk)</span>
                    </label>
                    <span className="text-[11px] font-medium text-slate-400">Toutes wilayas</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      step={50}
                      value={manualPriceDesk}
                      onChange={(e) => setManualPriceDesk(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="350"
                      className="w-full px-3.5 py-2.5 pr-14 text-sm font-bold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080914] text-slate-900 dark:text-white focus:border-sky-500 outline-none"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 dark:text-white/40">
                      DA
                    </span>
                  </div>
                  {/* Quick preset buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-400 dark:text-white/40 mr-1">Raccourcis :</span>
                    {[0, 300, 350, 400, 500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setManualPriceDesk(val)}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                          manualPriceDesk === val
                            ? "bg-sky-500/10 text-sky-400 border-sky-500/30"
                            : "bg-white dark:bg-white/5 text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10 hover:border-sky-500/30"
                        }`}
                      >
                        {val === 0 ? "Gratuit" : `${val} DA`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Accordion Personnalisation par Wilaya (ex: Grand Sud) */}
            <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-white/[0.01]">
              <button
                type="button"
                onClick={() => setShowWilayaDetails((prev) => !prev)}
                className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-100/50 dark:hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Personnaliser les prix par Wilaya (ex: Grand Sud, tarifs différenciés)
                  </span>
                  {customWilayasCount > 0 && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {customWilayasCount} personnalisée{customWilayasCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {showWilayaDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showWilayaDetails && (
                <div className="p-5 pt-3 border-t border-slate-200 dark:border-white/10 space-y-4">
                  {/* Toolbar & Filter */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={wilayaSearch}
                        onChange={(e) => setWilayaSearch(e.target.value)}
                        placeholder="Filtrer par nom ou numéro de wilaya..."
                        className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080914] text-slate-900 dark:text-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleApplyGrandSudPreset}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all"
                      >
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>+300 DA Grand Sud (17 wilayas)</span>
                      </button>

                      {customWilayasCount > 0 && (
                        <button
                          type="button"
                          onClick={handleResetAllCustomWilayas}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-200/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-white/20 transition-all"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Réinitialiser</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* List of Wilayas */}
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {filteredWilayas.map((w) => {
                      const custom = customWilayasShipping[w.id];
                      const isCustomized = custom !== undefined;
                      const curHome = custom?.price_home !== undefined ? custom.price_home : (isFreeShipping ? 0 : manualPriceHome);
                      const curDesk = custom?.price_desk !== undefined ? custom.price_desk : (isFreeShipping ? 0 : manualPriceDesk);

                      return (
                        <div
                          key={w.id}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl border text-xs transition-all ${
                            isCustomized
                              ? "bg-emerald-500/[0.04] border-emerald-500/20"
                              : "bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-[140px]">
                            <span className="font-bold text-slate-800 dark:text-white">{w.name}</span>
                            {isCustomized && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                                Modifié
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 dark:text-white/40">Domicile :</span>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  step={50}
                                  value={curHome}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value) || 0);
                                    setCustomWilayasShipping((prev) => ({
                                      ...prev,
                                      [w.id]: {
                                        ...(prev[w.id] || {}),
                                        price_home: val,
                                        price_desk: curDesk,
                                      },
                                    }));
                                  }}
                                  className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080914] text-slate-900 dark:text-white text-right outline-none focus:border-emerald-500"
                                />
                                <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 ml-1">DA</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-400 dark:text-white/40">Bureau :</span>
                              <div className="relative">
                                <input
                                  type="number"
                                  min={0}
                                  step={50}
                                  value={curDesk}
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value) || 0);
                                    setCustomWilayasShipping((prev) => ({
                                      ...prev,
                                      [w.id]: {
                                        ...(prev[w.id] || {}),
                                        price_home: curHome,
                                        price_desk: val,
                                      },
                                    }));
                                  }}
                                  className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#080914] text-slate-900 dark:text-white text-right outline-none focus:border-sky-500"
                                />
                                <span className="text-[10px] font-bold text-slate-400 dark:text-white/40 ml-1">DA</span>
                              </div>
                            </div>

                            {isCustomized && (
                              <button
                                type="button"
                                onClick={() => handleResetCustomWilaya(w.id)}
                                title="Réinitialiser au tarif général"
                                className="p-1 rounded-lg hover:bg-rose-500/10 text-rose-400 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ACTION GLOBALE : Bouton principal "Appliquer à tous mes funnels et boutiques" */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Application Universelle Immédiate
                  </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/60 max-w-xl">
                  Ces tarifs manuels ({isFreeShipping ? "Livraison Offerte 0 DA" : `${manualPriceHome} DA à domicile / ${manualPriceDesk} DA en bureau`}) seront injectés en base de données sur vos <strong>{stores.length} boutiques et funnels</strong> actifs.
                </p>
              </div>

              <button
                type="button"
                onClick={handleApplyShippingToAllStores}
                disabled={applyingShippingToAll}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-xs sm:text-sm text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-lg shadow-emerald-500/25 transition-all transform active:scale-[0.98] disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {applyingShippingToAll ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                    <span>Application à toutes vos boutiques...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-slate-950" />
                    <span>Appliquer à tous mes funnels et boutiques</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Transporteurs Algérie */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Intégration Transporteurs Algérie (Yalidine, ZR Express, Maystro)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Connectez votre compte transporteur pour synchroniser vos colis et générer vos étiquettes en direct.
                  </p>
                </div>
              </div>

              {userPlan.isFree && (
                <span
                  onClick={() => {
                    setUpgradeType("carrier");
                    setShowUpgradeModal(true);
                  }}
                  className="cursor-pointer inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-slate-950"
                >
                  <Crown className="w-3 h-3" />
                  Pack Pro
                </span>
              )}
            </div>

            {userPlan.isFree ? (
              <div className="rounded-2xl border-2 border-dashed border-amber-500/30 bg-amber-500/[0.02] p-6 text-center space-y-3">
                <Lock className="w-8 h-8 text-amber-500 mx-auto" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Intégration Transporteurs Réservée aux comptes Pro & Business
                </h4>
                <p className="text-xs text-slate-500 dark:text-white/60 max-w-md mx-auto">
                  Automatisez l&apos;envoi de vos colis vers les plateformes Yalidine Express, ZR Express et Maystro en 1 clic.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setUpgradeType("carrier");
                    setShowUpgradeModal(true);
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-slate-950 bg-amber-400 hover:bg-amber-300 shadow-md transition-all"
                >
                  <Crown className="w-4 h-4" />
                  <span>Activer les transporteurs (Pack Pro)</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                    Société de livraison partenaire
                  </label>
                  <select
                    value={carrierProvider}
                    onChange={(e) => setCarrierProvider(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                  >
                    <option value="yalidine">Yalidine Express</option>
                    <option value="zr_express">ZR Express</option>
                    <option value="maystro">Maystro Delivery</option>
                    <option value="custom">Transporteur Privé / Interne</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                    API ID / Identifiant Client
                  </label>
                  <input
                    type="text"
                    value={carrierApiId}
                    onChange={(e) => setCarrierApiId(e.target.value)}
                    placeholder="Ex: YAL-123456"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                    API Token / Clé Secrète
                  </label>
                  <input
                    type="password"
                    value={carrierApiToken}
                    onChange={(e) => setCarrierApiToken(e.target.value)}
                    placeholder="••••••••••••••••••••"
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Notifications & Alertes Commandes */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Alertes de Nouvelles Commandes en Temps Réel
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Recevez immédiatement les coordonnées du client pour lancer la confirmation téléphonique.
                </p>
              </div>
            </div>

            <div className="space-y-4 pt-1">
              <div className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Alerte par Email
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-white/50 mt-1">
                    Envoyer un récapitulatif détaillé à <strong>{user?.email}</strong> à chaque validation de panier COD.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={emailAlerts}
                    onChange={(e) => setEmailAlerts(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-sky-500" />
                  <span>Telegram Chat ID (Notification instantanée sur votre smartphone)</span>
                </label>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="Ex: 123456789"
                  className="w-full sm:max-w-md px-3.5 py-2.5 text-xs font-mono font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-accent outline-none"
                />
                <p className="text-[11px] text-slate-400 dark:text-white/40 mt-1">
                  Optionnel : Permet à votre équipe de recevoir une notification Telegram avec le bouton &quot;Appeler le client&quot; dès qu&apos;une commande arrive.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => handleSaveAll("Transporteurs & Notifications")}
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs text-white bg-accent hover:bg-accent/90 shadow-md shadow-accent/20 transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Enregistrer les réglages</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          ONGLET 5 : Mon Compte & Abonnement
      ═══════════════════════════════════════════════════════════════════════ */}
      {activeTab === "account-billing" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Profil Marchand */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center justify-center shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  Profil Marchand
                </h3>
                <p className="text-xs text-slate-500 dark:text-white/50">
                  Informations de connexion au compte EasyTrade.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <span className="text-[11px] text-slate-400 block">Nom du marchand :</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {user?.user_metadata?.full_name || "Non renseigné"}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
                <span className="text-[11px] text-slate-400 block">Email de connexion :</span>
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {user?.email}
                </span>
              </div>
            </div>
          </div>

          {/* Statut Abonnement */}
          <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-7 space-y-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Formule & Abonnement Actif
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Gérez votre plan et accédez aux factures BaridiMob / SATIM.
                  </p>
                </div>
              </div>

              <span
                className={`text-xs font-black uppercase px-3 py-1 rounded-full border ${
                  userPlan.isBusiness
                    ? "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30"
                    : userPlan.isPro
                    ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30"
                    : "bg-slate-100 dark:bg-white/[0.08] text-slate-600 dark:text-white/70 border-slate-200 dark:border-white/10"
                }`}
              >
                Plan {userPlan.planName}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {userPlan.isBusiness
                    ? "Pack Business — Boutiques illimitées & Équipe"
                    : userPlan.isPro
                    ? "Pack Pro — Jusqu'à 5 boutiques & Produits illimités"
                    : "Pack Gratuit — 1 Boutique & 10 produits"}
                </p>
                <p className="text-xs text-slate-400">
                  {userPlan.expiresAt
                    ? `Expire le : ${new Date(userPlan.expiresAt).toLocaleDateString("fr-DZ")} (${userPlan.daysRemaining ?? 0} jours restants)`
                    : "Aucune expiration programmée."}
                </p>
              </div>

              <Link
                href="/dashboard/upgrade"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all shrink-0"
              >
                <span>Changer de formule</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Zone de Danger */}
          <div className="rounded-3xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/30 dark:bg-rose-950/10 p-6 sm:p-7 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-sm sm:text-base font-bold">
                Zone de Danger — Suppression du projet
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-white/60 leading-relaxed">
              La suppression de <strong>« {currentStore?.name} »</strong> est irréversible. Toutes les fiches produits, commandes et configurations associées seront définitivement effacées.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmationName("");
                  setShowDeleteModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white bg-rose-600 hover:bg-rose-700 shadow-sm transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer cette boutique / ce funnel</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale de Confirmation de Suppression ────────────────────────────── */}
      {showDeleteModal && currentStore && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Supprimer définitivement ?
                </h3>
                <p className="text-xs text-slate-400">Cette action ne peut pas être annulée.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
              Pour confirmer la suppression, veuillez saisir le nom exact du projet :{" "}
              <strong className="text-slate-900 dark:text-white font-mono">{currentStore.name}</strong>
            </p>

            <input
              type="text"
              value={deleteConfirmationName}
              onChange={(e) => setDeleteConfirmationName(e.target.value)}
              placeholder={currentStore.name}
              className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-rose-500 outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingStore}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/60 hover:bg-slate-100"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteStore}
                disabled={
                  isDeletingStore || deleteConfirmationName.trim() !== currentStore.name.trim()
                }
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md disabled:opacity-40"
              >
                {isDeletingStore ? "Suppression..." : "Supprimer définitivement"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Upgrade Modal ────────────────────────────────────────────────────── */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        limitType={upgradeType}
        currentPlan={userPlan.plan}
        recommendedPlan="pro"
      />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
