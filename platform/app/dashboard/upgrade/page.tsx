"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Zap,
  Crown,
  Sparkles,
  ShieldCheck,
  CreditCard,
  MessageCircle,
  HelpCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase";

interface Plan {
  id: "free" | "pro" | "business";
  name: string;
  badge?: string;
  priceDZD: number;
  period: string;
  description: string;
  popular?: boolean;
  features: string[];
  cta: string;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "Gratuit",
    priceDZD: 0,
    period: "Pour toujours",
    description: "Idéal pour tester la plateforme et lancer votre première vitrine.",
    features: [
      "1 boutique en ligne",
      "Jusqu'à 10 produits",
      "Commandes via WhatsApp",
      "Sous-domaine easytrade.dz",
      "Génération IA basique (3 essais)",
      "Support communautaire",
    ],
    cta: "Votre plan actuel",
  },
  {
    id: "pro",
    name: "Pro Marchand",
    badge: "Le plus populaire",
    priceDZD: 2900,
    period: "par mois",
    description: "La solution complète pour les commerçants qui veulent maximiser leurs ventes.",
    popular: true,
    features: [
      "Jusqu'à 5 boutiques",
      "Produits illimités",
      "Nom de domaine personnalisé (.dz, .com)",
      "Générateur IA Gemini illimité",
      "Notifications Web Push en temps réel",
      "Frais de livraison par wilaya personnalisés",
      "Statistiques avancées & conversion",
      "Zéro commission sur les ventes",
      "Support prioritaire WhatsApp 7j/7",
    ],
    cta: "Passer au Pro",
  },
  {
    id: "business",
    name: "Business Élite",
    badge: "Pour grandes marques",
    priceDZD: 5900,
    period: "par mois",
    description: "Pour les distributeurs, marques établies et équipes à fort volume.",
    features: [
      "Boutiques illimitées",
      "Produits et catalogues illimités",
      "Tous les avantages du plan Pro",
      "Hébergement ultra-rapide sur CDN dédié",
      "Gestionnaire de compte dédié",
      "Accès prioritaire aux nouvelles fonctionnalités",
      "Accompagnement configuration personnalisé",
    ],
    cta: "Passer à l'Élite",
  },
];

const FAQS = [
  {
    q: "Quels sont les modes de paiement acceptés en Algérie ?",
    a: "Nous acceptons les virements BaridiMob, les virements CCP, ainsi que les cartes Edahabia et CIB. Dès réception de votre reçu, votre compte est activé instantanément.",
  },
  {
    q: "Y a-t-il des frais cachés ou une commission sur mes ventes ?",
    a: "Absolument zéro commission. 100% du chiffre d'affaires généré par vos ventes vous appartient. Vous ne payez que votre abonnement mensuel ou annuel fixe.",
  },
  {
    q: "Puis-je changer ou résilier mon abonnement à tout moment ?",
    a: "Oui, sans aucun engagement. Vous pouvez passer d'un plan à un autre ou annuler votre abonnement quand vous le souhaitez depuis votre espace marchand.",
  },
  {
    q: "Comment fonctionne la connexion de mon nom de domaine personnalisé ?",
    a: "Dès votre passage au plan Pro, nous vous guidons étape par étape pour associer votre propre domaine (ex: mathe-store.com ou .dz) en quelques minutes.",
  },
];

export default function UpgradePage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [currentPlan, setCurrentPlan] = useState<"free" | "pro" | "business">("free");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isActivating, setIsActivating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleSelectPlan = (plan: Plan) => {
    if (plan.id === currentPlan) return;
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleSimulateActivation = async () => {
    if (!selectedPlan || !user) return;
    setIsActivating(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ plan: selectedPlan.id, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      setCurrentPlan(selectedPlan.id);
      setShowPaymentModal(false);
      toast.success(`Félicitations ! Vous êtes désormais abonné au plan ${selectedPlan.name}.`);
    } catch (err) {
      console.error("Failed to update plan:", err);
      toast.error("Une erreur est survenue lors de l'activation.");
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-12">
      {/* Hero Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto pt-4">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-semibold text-indigo-300">
          <Sparkles className="h-3.5 w-3.5" /> Boostez votre e-commerce en Algérie
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Choisissez la formule adaptée à votre croissance
        </h1>
        <p className="text-sm sm:text-base text-white/50 leading-relaxed">
          Passez à la vitesse supérieure : domaines personnalisés, génération IA illimitée, zéro commission et assistance prioritaire.
        </p>

        {/* Monthly / Yearly Toggle */}
        <div className="inline-flex items-center rounded-xl border border-white/10 bg-white/[0.03] p-1 mt-4">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              billingCycle === "monthly" ? "bg-indigo-600 text-white shadow" : "text-white/50 hover:text-white"
            }`}
          >
            Facturation mensuelle
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              billingCycle === "yearly" ? "bg-indigo-600 text-white shadow" : "text-white/50 hover:text-white"
            }`}
          >
            Facturation annuelle
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
              -20%
            </span>
          </button>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const price = billingCycle === "yearly" ? Math.round(plan.priceDZD * 0.8) : plan.priceDZD;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-6 transition-all duration-200 ${
                plan.popular
                  ? "border-indigo-500/60 bg-gradient-to-b from-indigo-500/10 to-white/[0.02] shadow-2xl shadow-indigo-500/10 scale-[1.02]"
                  : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 px-3 py-0.5 text-[11px] font-bold text-white shadow-md">
                  {plan.badge}
                </div>
              )}

              {/* Title & Desc */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  {plan.id === "pro" && <Crown className="h-5 w-5 text-amber-400" />}
                  {plan.id === "business" && <Zap className="h-5 w-5 text-indigo-400" />}
                </div>
                <p className="text-xs text-white/50 mt-1 min-h-[32px]">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-white/[0.06]">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-white">
                    {price.toLocaleString("fr-DZ")}
                  </span>
                  <span className="text-xs font-semibold text-white/70">DZD</span>
                  {plan.priceDZD > 0 && (
                    <span className="text-xs text-white/40 ml-1">/ {billingCycle === "yearly" ? "mois (annuel)" : "mois"}</span>
                  )}
                </div>
                <p className="text-[11px] text-white/40 mt-1">{plan.period}</p>
              </div>

              {/* Features List */}
              <ul className="space-y-3 mb-8 flex-1 text-xs text-white/80">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mt-0.5">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* Action CTA */}
              <button
                type="button"
                disabled={isCurrent}
                onClick={() => handleSelectPlan(plan)}
                className={`w-full rounded-xl py-3 text-xs font-bold transition-all shadow-md ${
                  isCurrent
                    ? "bg-white/10 text-white/40 cursor-default shadow-none"
                    : plan.popular
                    ? "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25"
                    : "bg-white/10 hover:bg-white/20 text-white"
                }`}
              >
                {isCurrent ? "Votre plan actuel" : plan.cta}
              </button>
            </div>
          );
        })}
      </div>

      {/* Payment Guarantee & BaridiMob Info */}
      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-6 sm:p-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">BaridiMob & CCP</h4>
              <p className="text-xs text-white/50 mt-1">
                Paiement direct en Dinar Algérien sans carte internationale requise.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Zéro Commission</h4>
              <p className="text-xs text-white/50 mt-1">
                Gardez 100% de vos marges, nous ne prélevons rien sur vos commandes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/15 text-purple-400">
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white">Assistance WhatsApp</h4>
              <p className="text-xs text-white/50 mt-1">
                Une équipe locale dédiée pour vous accompagner dans la mise en ligne.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQs */}
      <div className="space-y-6 max-w-3xl mx-auto pt-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white flex items-center justify-center gap-2">
            <HelpCircle className="h-5 w-5 text-indigo-400" /> Foire aux questions
          </h2>
          <p className="text-xs text-white/50 mt-1">Tout ce que vous devez savoir sur nos offres</p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq) => (
            <div
              key={faq.q}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-left"
            >
              <h4 className="text-sm font-semibold text-white">{faq.q}</h4>
              <p className="text-xs text-white/50 mt-1.5 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Instructions Modal */}
      {showPaymentModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101018] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-base font-bold text-white">
                  Activation du plan {selectedPlan.name}
                </h3>
                <p className="text-xs text-white/50 mt-0.5">
                  Montant : {(billingCycle === "yearly" ? selectedPlan.priceDZD * 0.8 * 12 : selectedPlan.priceDZD).toLocaleString("fr-DZ")} DZD
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-white/40 hover:text-white transition-colors text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-white/70">
              <p>Pour activer votre abonnement, effectuez votre virement vers l&apos;un des comptes ci-dessous :</p>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5 space-y-2 font-mono">
                <div className="flex justify-between">
                  <span className="text-white/40 font-sans">BaridiMob (RIP) :</span>
                  <span className="text-indigo-300 font-bold">00799999002345678901</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-sans">CCP :</span>
                  <span className="text-indigo-300 font-bold">12345678 Clé 99</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 font-sans">Titulaire :</span>
                  <span className="text-white">EasyTrade Algérie</span>
                </div>
              </div>
              <p className="text-[11px] text-white/50">
                Une fois le virement effectué, envoyez votre reçu ou capture d&apos;écran avec votre email de compte ({user?.email}) sur notre WhatsApp officiel pour validation immédiate.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href={`https://wa.me/213550000000?text=${encodeURIComponent(
                  `Bonjour EasyTrade, je souhaite activer le plan ${selectedPlan.name} pour mon compte ${user?.email}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20"
              >
                <MessageCircle className="h-4 w-4" /> Envoyer le reçu sur WhatsApp
              </a>

              <button
                type="button"
                disabled={isActivating}
                onClick={handleSimulateActivation}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {isActivating ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Activation en cours...
                  </>
                ) : (
                  <>
                    <Zap className="h-3.5 w-3.5" /> Activer immédiatement (Mode Immédiat)
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
