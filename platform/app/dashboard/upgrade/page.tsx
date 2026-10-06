"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Zap,
  ShieldCheck,
  CreditCard,
  Sparkles,
  ArrowRight,
  Clock,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  Award,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";

interface PlanTier {
  id: "free" | "pro" | "business";
  name: string;
  tagline: string;
  monthlyPrice: number;
  yearlyPrice: number;
  storesLimit: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

const PLANS: PlanTier[] = [
  {
    id: "free",
    name: "Gratuit",
    tagline: "Pour lancer votre première boutique en ligne",
    monthlyPrice: 0,
    yearlyPrice: 0,
    storesLimit: "1 Boutique active",
    features: [
      "1 Boutique active",
      "Jusqu'à 10 produits",
      "Thèmes standards personnalisables",
      "Paiement à la livraison (COD) intégré",
      "Gestion des commandes de base",
      "Support communautaire",
    ],
    cta: "Votre plan actuel",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Idéal pour les marchands et créateurs de marques en expansion",
    monthlyPrice: 2000,
    yearlyPrice: 20000,
    popular: true,
    storesLimit: "Jusqu'à 5 Boutiques actives",
    features: [
      "Jusqu'à 5 Boutiques & Tunnels actifs",
      "Produits & Variantes illimités",
      "Tous les thèmes premium de la vitrine",
      "Génération IA de descriptions & visuels",
      "Grille de livraison 58 wilayas personnalisable",
      "Nom de domaine personnalisé (.com, .dz)",
      "Analytiques détaillées des ventes",
      "Support prioritaire WhatsApp 7j/7",
    ],
    cta: "Passer au plan Pro",
  },
  {
    id: "business",
    name: "Business",
    tagline: "Pour les agences, e-commerçants confirmés et équipes",
    monthlyPrice: 5000,
    yearlyPrice: 50000,
    storesLimit: "Boutiques illimitées",
    features: [
      "Boutiques, Landing Pages & Tunnels illimités",
      "Tous les avantages du plan Pro",
      "Multi-utilisateurs & permissions d'équipe",
      "Génération IA haute priorité sans quota",
      "Accès API REST & Webhooks personnalisés",
      "Bande passante CDN accélérée",
      "Facturation d'entreprise dédiée",
      "Gestionnaire de compte VIP dédié 24/7",
    ],
    cta: "Passer au plan Business",
  },
];

interface Transaction {
  id: string;
  plan: string;
  amount: number;
  currency: string;
  billing_period: string;
  invoice_id: string;
  payment_url?: string;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  paid_at?: string;
  expires_at?: string;
  created_at: string;
}

export default function UpgradePage() {
  const router = useRouter();
  const { user } = useAuth();

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [isLoadingStatus, setIsLoadingStatus] = useState<boolean>(true);
  const [isUpgrading, setIsUpgrading] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(false);

  // Charger le statut d'abonnement
  const loadStatus = async () => {
    try {
      setIsLoadingStatus(true);
      const res = await api.get("/api/payment/status");
      if (res.data) {
        setCurrentPlan(res.data.plan || "free");
        setExpiresAt(res.data.expires_at || null);
        setDaysRemaining(res.data.days_remaining ?? null);
      }
    } catch (err) {
      console.warn("Erreur chargement statut abonnement:", err);
    } finally {
      setIsLoadingStatus(false);
    }
  };

  // Charger les transactions passées
  const loadTransactions = async () => {
    try {
      setIsLoadingTx(true);
      const res = await api.get("/api/payment/transactions");
      if (res.data?.transactions) {
        setTransactions(res.data.transactions);
      }
    } catch (err) {
      console.warn("Erreur chargement transactions:", err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  useEffect(() => {
    loadStatus();
    loadTransactions();
  }, []);

  const handleSelectPlan = async (tier: PlanTier) => {
    if (tier.id === "free") {
      toast.info("Le plan Gratuit est actif par défaut.");
      return;
    }

    if (tier.id === currentPlan && daysRemaining && daysRemaining > 3) {
      toast.info(`Vous bénéficiez déjà du plan ${tier.name} (encore ${daysRemaining} jours restants).`);
      return;
    }

    try {
      setIsUpgrading(tier.id);
      toast.loading("Génération de la facture BaridiMob / SATIM...", { id: "payment-toast" });

      const returnUrl = `${window.location.origin}/dashboard/upgrade/callback`;

      const response = await api.post("/api/payment/create-subscription-invoice", {
        plan: tier.id,
        billing_period: billingPeriod,
        return_url: returnUrl,
      });

      const { payment_url, invoice_id, is_simulation } = response.data;

      if (!payment_url) {
        throw new Error("Aucune URL de paiement reçue.");
      }

      toast.success(
        is_simulation
          ? "Mode Sandbox : Redirection vers le paiement simulé..."
          : "Redirection vers le paiement sécurisé BaridiMob / SATIM...",
        { id: "payment-toast" }
      );

      // Redirige vers le portail SATIM SlickPay
      setTimeout(() => {
        window.location.href = payment_url;
      }, 700);
    } catch (error: any) {
      console.error("Échec création paiement:", error);
      const detail = error.response?.data?.detail || error.message || "Erreur lors de l'initialisation du paiement";
      toast.error(`Erreur: ${detail}`, { id: "payment-toast" });
      setIsUpgrading(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return "-";
    try {
      const date = new Date(isoString);
      return new Intl.DateTimeFormat("fr-DZ", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-10 pb-16">
      {/* ── En-tête Hero ──────────────────────────────────────────────────────── */}
      <div className="text-center max-w-3xl mx-auto space-y-4 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-accent/10 dark:bg-accent/20 text-accent dark:text-sky border border-accent/20 dark:border-sky/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Abonnement SaaS StoreGen</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Passez au niveau supérieur avec le plan adapté à votre activité
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base leading-relaxed">
          Activez plus de boutiques, la génération par IA illimitée et les fonctionnalités avancées.
          Paiement sécurisé et instantané en Algérie via <strong className="text-slate-800 dark:text-slate-200">BaridiMob</strong>, <strong className="text-slate-800 dark:text-slate-200">Carte Edahabia</strong> ou <strong className="text-slate-800 dark:text-slate-200">CIB</strong>.
        </p>

        {/* ── Badge statut actuel ────────────────────────────────────────────── */}
        {!isLoadingStatus && (
          <div className="pt-2">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] text-xs">
              <span className="text-slate-500 dark:text-slate-400">Plan actuel :</span>
              <span className="font-bold uppercase tracking-wider text-accent dark:text-sky">
                {currentPlan === "free" ? "Gratuit" : currentPlan}
              </span>
              {currentPlan !== "free" && daysRemaining !== null && (
                <>
                  <span className="text-slate-300 dark:text-slate-600">•</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {daysRemaining > 0 ? `${daysRemaining} jours restants` : "Expire aujourd'hui"}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* ── Bascule Période de facturation ─────────────────────────────────── */}
        <div className="pt-4 flex items-center justify-center">
          <div className="relative flex items-center p-1 rounded-2xl bg-slate-200/70 dark:bg-white/[0.06] border border-slate-300/80 dark:border-white/10 shadow-inner">
            <button
              onClick={() => setBillingPeriod("monthly")}
              className={`relative px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                billingPeriod === "monthly"
                  ? "bg-white dark:bg-accent text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Mensuel
            </button>

            <button
              onClick={() => setBillingPeriod("yearly")}
              className={`relative flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 ${
                billingPeriod === "yearly"
                  ? "bg-white dark:bg-accent text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>Annuel</span>
              <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                -17% (2 mois offerts)
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Grille des Plans ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
        {PLANS.map((tier) => {
          const isCurrent = currentPlan === tier.id;
          const price = billingPeriod === "yearly" ? tier.yearlyPrice : tier.monthlyPrice;
          const displayPrice = price.toLocaleString("fr-DZ");
          const periodLabel = billingPeriod === "yearly" ? "/ an" : "/ mois";

          return (
            <motion.div
              key={tier.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`relative flex flex-col justify-between rounded-2xl p-6 sm:p-8 transition-all ${
                tier.popular
                  ? "bg-gradient-to-b from-indigo-50/70 via-white to-white dark:from-accent/20 dark:via-[#0c0d1e] dark:to-ink border-2 border-accent dark:border-sky/60 shadow-xl shadow-accent/10 dark:shadow-sky/10"
                  : "bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/[0.08] shadow-sm hover:border-slate-300 dark:hover:border-white/20"
              }`}
            >
              {/* Badge populaire */}
              {tier.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-accent text-white text-[11px] font-bold tracking-wide uppercase shadow-md flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>Recommandé</span>
                </div>
              )}

              <div>
                {/* Titre & Description */}
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                    {tier.name}
                  </h3>
                  {isCurrent && (
                    <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-300 dark:border-emerald-800">
                      Actuel
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 min-h-[32px]">
                  {tier.tagline}
                </p>

                {/* Prix */}
                <div className="mt-6 pb-6 border-b border-slate-100 dark:border-white/[0.08]">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {displayPrice}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                      DZD {price > 0 ? periodLabel : ""}
                    </span>
                  </div>
                  {billingPeriod === "yearly" && price > 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                      Équivaut à {(price / 12).toFixed(0)} DZD / mois
                    </p>
                  )}
                </div>

                {/* Limite boutique */}
                <div className="py-4">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                    <Award className="w-4 h-4 text-accent dark:text-sky shrink-0" />
                    <span>{tier.storesLimit}</span>
                  </div>
                </div>

                {/* Liste des fonctionnalités */}
                <div className="space-y-3 pt-2">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 dark:text-slate-500">
                    Ce qui est inclus :
                  </p>
                  {tier.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 stroke-[2.5]" />
                      </div>
                      <span className="leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bouton d'action */}
              <div className="pt-8 mt-auto">
                <button
                  onClick={() => handleSelectPlan(tier)}
                  disabled={isCurrent && (!daysRemaining || daysRemaining > 3) || isUpgrading !== null}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm ${
                    tier.popular
                      ? "bg-accent hover:bg-accent/90 text-white shadow-accent/25 hover:shadow-accent/40"
                      : isCurrent
                      ? "bg-slate-100 dark:bg-white/[0.05] text-slate-400 dark:text-slate-500 cursor-not-allowed"
                      : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                  }`}
                >
                  {isUpgrading === tier.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Initialisation BaridiMob...</span>
                    </>
                  ) : isCurrent ? (
                    <span>Plan actuellement actif</span>
                  ) : (
                    <>
                      <span>{tier.cta}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Bannière Moyens de Paiement Algériens ────────────────────────────── */}
      <div className="max-w-4xl mx-auto rounded-2xl p-6 sm:p-8 bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/[0.08] shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Passerelle de paiement officielle SATIM via SlickPay</span>
            </div>
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Paiement 100% sécurisé et activation instantanée en dinars algériens
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
              Payez directement depuis votre smartphone avec l&apos;application <strong>BaridiMob</strong> (Algérie Poste) ou par carte <strong>Edahabia</strong> et <strong>CIB</strong> de toutes les banques algériennes (BNA, CPA, BEA, BADR, Al Baraka...).
            </p>
          </div>

          {/* Badges Logos */}
          <div className="flex flex-wrap items-center justify-center gap-3 shrink-0">
            <div className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span>BaridiMob</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/40 text-sky-700 dark:text-sky-300 font-bold text-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <span>Edahabia</span>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40 text-indigo-700 dark:text-indigo-300 font-bold text-xs flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>CIB / SATIM</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Historique des Paiements ────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Historique de facturation
            </h3>
          </div>
          <button
            onClick={() => {
              loadStatus();
              loadTransactions();
            }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualiser</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/[0.08] overflow-hidden shadow-sm">
          {isLoadingTx ? (
            <div className="py-12 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
              Aucune transaction d&apos;abonnement enregistrée pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-white/[0.02] border-b border-slate-200/80 dark:border-white/[0.06] text-slate-500 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Plan</th>
                    <th className="py-3 px-4">Montant</th>
                    <th className="py-3 px-4">Période</th>
                    <th className="py-3 px-4">Réf. Facture</th>
                    <th className="py-3 px-4 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                  {transactions.map((tx) => {
                    const isPaid = tx.status === "paid";
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.01]">
                        <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200">
                          {formatDate(tx.created_at)}
                        </td>
                        <td className="py-3.5 px-4 font-bold uppercase text-accent dark:text-sky">
                          {tx.plan}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {Number(tx.amount).toLocaleString("fr-DZ")} DZD
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 capitalize">
                          {tx.billing_period === "yearly" ? "Annuel" : "Mensuel"}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {tx.invoice_id || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              isPaid
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                                : tx.status === "pending"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                                : "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                            }`}
                          >
                            {isPaid ? "Payé" : tx.status === "pending" ? "En attente" : tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── FAQ Rapide ──────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto pt-6 border-t border-slate-200/80 dark:border-white/[0.08] space-y-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-accent dark:text-sky" />
          <span>Questions fréquentes</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              Comment fonctionne le paiement BaridiMob ?
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Après avoir cliqué sur votre plan, vous êtes redirigé vers la page sécurisée SATIM de SlickPay. Vous entrez votre numéro de carte Edahabia ou CIB et recevez un code OTP SMS pour valider.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-100/70 dark:bg-white/[0.03] space-y-1">
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              L&apos;activation de mon plan est-elle immédiate ?
            </p>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
              Oui, dès que le paiement est confirmé par le serveur SATIM, votre compte est automatiquement mis à niveau en temps réel.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
