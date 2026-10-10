"use client";

import React from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  currentPlan?: string;
  recommendedPlan?: "pro" | "business";
  limitType?: "stores" | "products" | "team" | "domain" | "ai";
}

export default function UpgradeModal({
  isOpen,
  onClose,
  title = "Passez au niveau supérieur 🚀",
  description,
  currentPlan = "free",
  recommendedPlan = "pro",
  limitType = "stores",
}: UpgradeModalProps) {
  if (!isOpen) return null;

  const defaultDescription =
    limitType === "stores"
      ? "Vous avez atteint la limite de boutiques autorisée par votre plan actuel. Débloquez jusqu'à 5 boutiques avec le Pack Pro !"
      : limitType === "products"
      ? "Vous avez atteint la limite de 10 produits pour le plan Gratuit. Débloquez des produits illimités avec le Pack Pro !"
      : limitType === "team"
      ? "La gestion des accès et membres d'équipe est réservée aux marchands du Pack Business."
      : "Cette fonctionnalité avancée est disponible sur nos plans supérieurs.";

  const isBusinessTarget = recommendedPlan === "business";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/[0.08] shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-white"
        >
          {/* Top Decorative Glow */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sky-400 via-blue-600 to-indigo-600" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon Badge */}
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5 shadow-sm">
            <Sparkles className="w-6 h-6" />
          </div>

          {/* Heading */}
          <h2 className="text-xl sm:text-2xl font-black tracking-tight mb-2">
            {title}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            {description || defaultDescription}
          </p>

          {/* Features Comparison Box */}
          <div className="rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.06] p-4 mb-6 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              <span>Avantages débloqués avec le Pack {isBusinessTarget ? "Business" : "Pro"} :</span>
            </div>

            <ul className="space-y-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
              {isBusinessTarget ? (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Boutiques & Funnels illimités</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Gestion multi-utilisateurs & permissions d&apos;équipe</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Génération IA haute priorité sans quota</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Gestionnaire de compte VIP dédié</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Jusqu&apos;à 5 Boutiques actives</strong> (au lieu d&apos;une seule)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span><strong>Produits & Variantes illimités</strong></span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Génération IA de descriptions & visuels produits</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>Nom de domaine personnalisé (.com, .dz)</span>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Pricing mention & CTA Button */}
          <div className="space-y-3">
            <Link
              href="/dashboard/upgrade"
              className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all"
            >
              <span>
                Passer au {isBusinessTarget ? "Pack Business (5 000 DZD)" : "Pack Pro (2 000 DZD)"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Paiement instantané BaridiMob / Edahabia / CIB
              </span>
              <button
                onClick={onClose}
                className="hover:underline font-medium text-slate-600 dark:text-slate-300"
              >
                Plus tard
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
