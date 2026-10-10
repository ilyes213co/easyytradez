"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Crown,
  Lock,
  ArrowRight,
  Check,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/components/auth/AuthProvider";

export default function TeamPage() {
  const { user } = useAuth();
  const [userPlan, setUserPlan] = useState<string>("free");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get("/api/payment/status");
        if (res.data?.plan) {
          setUserPlan(res.data.plan.toLowerCase());
        }
      } catch (err) {
        console.warn("Erreur chargement plan:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const isBusiness = userPlan === "business";

  return (
    <div className="space-y-6 pb-12">
      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Mon Équipe
            </h1>
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                isBusiness
                  ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                  : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-white/[0.05] dark:text-slate-400 dark:border-white/[0.1]"
              }`}
            >
              Exclusivité Business
            </span>
          </div>
          <p className="text-slate-500 dark:text-white/60 text-sm mt-1">
            Gérez les accès, rôles et permissions des membres de votre équipe.
          </p>
        </div>

        {isBusiness && (
          <button className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-lg self-start sm:self-auto transition-colors">
            <UserPlus className="w-4 h-4" />
            <span>Inviter un collaborateur</span>
          </button>
        )}
      </div>

      {/* ── Paywall si l'utilisateur n'a pas le Pack Business ───────────────── */}
      {!isLoading && !isBusiness && (
        <div className="relative overflow-hidden rounded-3xl border border-purple-200 dark:border-purple-800/40 bg-gradient-to-br from-purple-50/50 via-white to-blue-50/40 dark:from-purple-950/20 dark:via-[#0c0d1c] dark:to-blue-950/20 p-8 sm:p-10 shadow-xl">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Fonctionnalité réservée au Pack Business</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Déléguez et pilotez votre boutique avec votre équipe 👥
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Le Pack Business vous permet d&apos;inviter vos associés, gestionnaires de commandes (confirmation COD), et agents de support sans jamais partager votre mot de passe ni vos coordonnées bancaires.
              </p>
            </div>

            {/* Avantages Business */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Membres & Rôles illimités</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Boutiques & Tunnels illimités</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Accès restreint aux commandes COD</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Gestionnaire de compte VIP 24/7</span>
              </div>
            </div>

            {/* Bouton d'action */}
            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <Link
                href="/dashboard/upgrade"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/25 transition-all"
              >
                <span>Débloquer avec le Pack Business (5 000 DZD / mois)</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <span className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
                Paiement instantané BaridiMob / Edahabia
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Liste des membres ─────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Gestion des Rôles & Accès
            </h3>
            <p className="text-xs text-slate-500 dark:text-white/50">
              Attribuez des permissions spécifiques pour vos funnels et boutiques (Administrateur, Gestionnaire des commandes, Support client).
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 dark:border-white/[0.05] bg-slate-50 dark:bg-white/[0.02] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 border border-blue-400 flex items-center justify-center text-white text-xs font-bold uppercase">
              {user?.email?.slice(0, 2) || "AD"}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {user?.user_metadata?.full_name || user?.email || "Propriétaire du compte"}
              </p>
              <p className="text-xs text-slate-500 dark:text-white/40">
                Accès complet à tous les funnels et boutiques
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Propriétaire
          </span>
        </div>
      </div>
    </div>
  );
}
