"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Crown,
  Check,
  Trash2,
  Loader2,
  AlertTriangle,
  Clock,
  X,
  Zap,
  Award,
  TrendingUp,
  PhoneCall,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useUserPlan } from "@/lib/use-user-plan";
import UpgradeModal from "@/components/dashboard/UpgradeModal";

interface StoreOption {
  id: string;
  name: string;
  type: string;
}

interface MemberPerformanceStats {
  id: string;
  user_id?: string | null;
  email: string;
  role: string;
  is_active: boolean;
  last_assigned_at: string | null;
  created_at: string;
  total_assigned: number;
  pending_calls: number;
  confirmed: number;
  cancelled: number;
  postponed: number;
  confirmation_rate: number;
  cancellation_rate: number;
  is_top_performer: boolean;
}

const ROLE_CONFIGS: Record<
  string,
  { label: string; desc: string; badge: string }
> = {
  admin: {
    label: "Administrateur",
    desc: "Accès complet aux produits, commandes et réglages",
    badge: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
  },
  manager: {
    label: "Gestionnaire (Confirmation COD)",
    desc: "Confirmation des commandes COD et gestion du stock",
    badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
  },
  editor: {
    label: "Éditeur",
    desc: "Modification des fiches produits et visuels",
    badge: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  },
  support: {
    label: "Support Client",
    desc: "Suivi des expéditions et service après-vente",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
  viewer: {
    label: "Lecteur",
    desc: "Consultation uniquement sans droit de modification",
    badge: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  },
};

export default function TeamPage() {
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();
  const userPlan = useUserPlan();

  const [stores, setStores] = useState<StoreOption[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("all");
  const [teamStats, setTeamStats] = useState<MemberPerformanceStats[]>([]);
  const [summary, setSummary] = useState({
    totalPending: 0,
    totalAssigned: 0,
    activeAgents: 0,
    totalConfirmed: 0,
  });
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [togglingMemberId, setTogglingMemberId] = useState<string | null>(null);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "support">("manager");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [memberToDelete, setMemberToDelete] = useState<MemberPerformanceStats | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 1. Fetch user's stores
  useEffect(() => {
    async function loadStores() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from("stores")
          .select("id, name, type")
          .eq("owner_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        const list = (data || []) as StoreOption[];
        setStores(list);
      } catch (err) {
        console.warn("Could not load user stores:", err);
      }
    }
    loadStores();
  }, [user, supabase]);

  // 2. Fetch team members and performance stats when user is Business
  const loadMembers = useCallback(async () => {
    if (!userPlan.isBusiness) return;
    setLoadingMembers(true);
    try {
      const res = await fetch("/api/team/stats");
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Erreur lors du chargement des statistiques de l'équipe");
      }
      const data = await res.json();
      setTeamStats(data.stats || []);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.warn("Error loading team stats:", err.message);
      setTeamStats([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [userPlan.isBusiness]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // 3. Smart Dispatch: Rebalance Orders across active members
  const handleRebalance = async () => {
    setIsRebalancing(true);
    try {
      const res = await fetch("/api/team/rebalance", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Erreur lors du ré-équilibrage");
      }
      toast.success(
        data.message ||
          `${data.rebalanced_count ?? 0} commande(s) redistribuée(s) équitablement entre vos téléopérateurs disponibles !`
      );
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || "Échec du ré-équilibrage");
    } finally {
      setIsRebalancing(false);
    }
  };

  // 4. Toggle Employee Active / Paused status
  const handleToggleActive = async (memberId: string, currentStatus: boolean) => {
    setTogglingMemberId(memberId);
    const newStatus = !currentStatus;
    // Optimistic UI update
    setTeamStats((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, is_active: newStatus } : m))
    );
    try {
      const res = await fetch("/api/team", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: memberId, is_active: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || "Erreur de mise à jour");
      }
      toast.success(
        newStatus
          ? "Confirmateur activé (disponible pour Smart Dispatch)"
          : "Confirmateur mis en pause (plus de nouvelles attributions)"
      );
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || "Impossible de changer le statut");
      loadMembers();
    } finally {
      setTogglingMemberId(null);
    }
  };

  // 5. Handle Invite Member
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Veuillez saisir une adresse email valide");
      return;
    }

    setIsSubmitting(true);
    try {
      const targetStoreId = selectedStoreId !== "all" ? selectedStoreId : stores[0]?.id || null;

      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: targetStoreId,
          user_email: inviteEmail.trim(),
          role: inviteRole,
        }),
      });

      const resData = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (resData.code === "PLAN_LIMIT_REACHED" || res.status === 403) {
          setShowUpgradeModal(true);
          return;
        }
        throw new Error(resData.detail || resData.message || "Erreur lors de l'invitation");
      }

      toast.success(`Invitation envoyée à ${inviteEmail}`);
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteRole("manager");
      loadMembers();
    } catch (err: any) {
      toast.error(err.message || "Impossible d'ajouter ce collaborateur");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Handle Delete Member
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/team?id=${memberToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Erreur lors de la suppression");
      }

      toast.success("Collaborateur retiré de l'équipe");
      setTeamStats((prev) => prev.filter((m) => m.id !== memberToDelete.id));
      setMemberToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur de suppression");
    } finally {
      setIsDeleting(false);
    }
  };

  const isBusiness = userPlan.isBusiness;

  return (
    <div className="space-y-6 pb-16">
      {/* ── En-tête avec Actions Propriétaire ──────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Call Center & Équipe de Confirmation</span>
            </h1>
            <span
              className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                isBusiness
                  ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                  : "bg-slate-100 text-slate-600 border-slate-300 dark:bg-white/[0.05] dark:text-slate-400 dark:border-white/[0.1]"
              }`}
            >
              {isBusiness ? "Call Center Actif" : "Exclusivité Business"}
            </span>
          </div>
          <p className="text-slate-500 dark:text-white/60 text-sm mt-1">
            Gestion du Call Center COD, invitation de téléopérateurs, Smart Dispatch multi-boutiques et suivi des confirmations en temps réel.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isBusiness && (
            <button
              onClick={handleRebalance}
              disabled={isRebalancing || teamStats.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-800 dark:text-white bg-white dark:bg-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.1] border border-slate-200 dark:border-white/10 shadow-sm active:scale-95 transition-all disabled:opacity-50"
              title="Redistribue équitablement toutes les commandes en attente entre les confirmateurs disponibles"
            >
              <Zap className={`w-4 h-4 text-amber-500 ${isRebalancing ? "animate-spin" : ""}`} />
              <span>{isRebalancing ? "Ré-équilibrage..." : "⚡ Ré-équilibrer en attente"}</span>
            </button>
          )}

          {isBusiness ? (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Inviter un confirmateur</span>
            </button>
          ) : (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
            >
              <Crown className="w-4 h-4" />
              <span>Passer au Pack Business</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Cartes de Synthèse Performance Propriétaire ────────────────────── */}
      {isBusiness && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0d1c] border border-slate-200/90 dark:border-white/[0.08] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-white/50">
                En attente globale
              </span>
              <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {summary.totalPending}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-white/40 mt-0.5">
              Commandes pending à distribuer
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0d1c] border border-slate-200/90 dark:border-white/[0.08] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-white/50">
                Confirmateurs actifs
              </span>
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
              {summary.activeAgents} / {teamStats.length}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-white/40 mt-0.5">
              Prêts pour Smart Dispatch
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0d1c] border border-slate-200/90 dark:border-white/[0.08] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-white/50">
                Total Confirmations
              </span>
              <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {summary.totalConfirmed}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-white/40 mt-0.5">
              Commandes validées par l&apos;équipe
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-[#0c0d1c] border border-slate-200/90 dark:border-white/[0.08] shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-white/50">
                Taux de Réussite Équipe
              </span>
              <span className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
              {summary.totalAssigned > 0
                ? Math.round((summary.totalConfirmed / summary.totalAssigned) * 100)
                : 0}
              %
            </p>
            <p className="text-[11px] text-slate-400 dark:text-white/40 mt-0.5">
              Sur {summary.totalAssigned} commandes traitées
            </p>
          </div>
        </div>
      )}

      {/* ── Paywall si l'utilisateur n'a pas le Pack Business ───────────────── */}
      {!isBusiness && (
        <div className="relative overflow-hidden rounded-3xl border border-purple-200 dark:border-purple-800/40 bg-gradient-to-br from-purple-50/50 via-white to-blue-50/40 dark:from-purple-950/20 dark:via-[#0c0d1c] dark:to-blue-950/20 p-8 sm:p-10 shadow-xl">
          <div className="max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              <Crown className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Fonctionnalité réservée au Pack Business</span>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Pilotez vos ventes avec votre Call Center COD 🎧
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                Le Pack Business vous permet d&apos;inviter vos téléopérateurs de confirmation COD, de répartir automatiquement les commandes via le Smart Dispatch multi-funnels, et de mesurer le taux de confirmation de chaque employé en temps réel.
              </p>
            </div>

            {/* Avantages Business */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Smart Dispatch Call Center Algérie</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Membres & Confirmateurs illimités</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Accès isolé aux commandes (zéro fuite financière)</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Classement et statistiques de performance</span>
              </div>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/dashboard/upgrade"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-accent shadow-lg shadow-purple-500/25 hover:opacity-95 active:scale-95 transition-all text-center"
              >
                <span>Débloquer le Pack Business</span>
                <Crown className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Tableau / Cartes de Performance par Employé ──────────────────────── */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Performance & Leaderboard du Call Center
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50">
                Accès global sur tous vos Funnels et Boutiques. Les téléopérateurs en pause ne reçoivent plus de commandes automatiques.
              </p>
            </div>
          </div>

          {isBusiness && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10 self-start sm:self-auto">
              {teamStats.length + 1} membre{teamStats.length + 1 > 1 ? "s" : ""} au total
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* Carte Propriétaire (Compte Administrateur Suprême) */}
          <div className="rounded-2xl border border-slate-100 dark:border-white/[0.05] bg-slate-50/80 dark:bg-white/[0.02] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs font-bold uppercase shadow-sm">
                {user?.email?.slice(0, 2) || "AD"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {user?.user_metadata?.full_name || user?.email || "Propriétaire"}
                  </p>
                  <span className="text-[10px] text-slate-400 dark:text-white/40">
                    ({user?.email})
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-white/40">
                  Propriétaire du compte — Administrateur de toutes les boutiques et funnels
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
              <UserCheck className="w-3 h-3" />
              <span>Propriétaire</span>
            </span>
          </div>

          {/* Loader */}
          {isBusiness && loadingMembers && (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
              <p className="text-xs">Chargement des performances de l&apos;équipe...</p>
            </div>
          )}

          {/* Liste détaillée des employés avec KPIs COD */}
          {isBusiness &&
            !loadingMembers &&
            teamStats.map((member) => {
              const roleInfo =
                ROLE_CONFIGS[member.role] ?? {
                  label: "Confirmateur",
                  desc: "Gestion des commandes",
                  badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
                };

              return (
                <div
                  key={member.id}
                  className={`rounded-2xl border p-4.5 sm:p-5 flex flex-col gap-4 transition-all shadow-sm ${
                    member.is_top_performer
                      ? "border-amber-400/40 bg-gradient-to-r from-amber-500/[0.04] via-transparent to-transparent dark:border-amber-500/30"
                      : "border-slate-100 dark:border-white/[0.06] bg-white dark:bg-[#0c0d1c] hover:border-slate-200 dark:hover:border-white/10"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center text-sm uppercase">
                          {member.email.slice(0, 2)}
                        </div>
                        {member.is_top_performer && (
                          <span
                            className="absolute -top-1.5 -right-1.5 text-amber-500 text-sm"
                            title="Meilleur confirmateur de l'équipe"
                          >
                            👑
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {member.email}
                          </p>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.badge}`}
                          >
                            {roleInfo.label}
                          </span>
                          {member.is_top_performer && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                              🏆 Top Confirmateur
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-white/40 mt-0.5">
                          {member.last_assigned_at
                            ? `Dernière attribution : ${new Date(member.last_assigned_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                            : "Pas encore de commande attribuée"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      {/* Switch Actif / En pause */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(member.id, member.is_active)}
                        disabled={togglingMemberId === member.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                          member.is_active
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20"
                            : "bg-slate-100 text-slate-500 dark:bg-white/[0.05] dark:text-white/40 border-slate-200 dark:border-white/10 hover:bg-slate-200/60"
                        }`}
                        title={
                          member.is_active
                            ? "Cliquez pour mettre en pause ce confirmateur"
                            : "Cliquez pour réactiver ce confirmateur dans le Smart Dispatch"
                        }
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            member.is_active ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                          }`}
                        />
                        <span>{member.is_active ? "Disponible" : "En pause"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setMemberToDelete(member)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                        title="Retirer ce collaborateur"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Statistiques Métier COD */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/[0.04]">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-white/50">
                        Total Assignées
                      </span>
                      <p className="text-lg font-black text-slate-900 dark:text-white mt-1">
                        {member.total_assigned}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-orange-500/[0.05] border border-orange-500/15">
                      <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                        En attente d&apos;appel
                      </span>
                      <p className="text-lg font-black text-orange-600 dark:text-orange-400 mt-1">
                        {member.pending_calls}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/15">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          Confirmées
                        </span>
                        <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                          {member.confirmation_rate}%
                        </span>
                      </div>
                      <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        {member.confirmed}
                      </p>
                      {/* Barre de progression verte */}
                      <div className="w-full bg-emerald-500/20 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${member.confirmation_rate}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-500/[0.05] border border-rose-500/15">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                          Annulées / Faux
                        </span>
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          {member.cancellation_rate}%
                        </span>
                      </div>
                      <p className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">
                        {member.cancelled}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

          {isBusiness && !loadingMembers && teamStats.length === 0 && (
            <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400 space-y-2">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-white/20" />
              <p className="text-sm font-semibold text-slate-700 dark:text-white/70">
                Aucun téléopérateur dans votre équipe
              </p>
              <p className="text-xs text-slate-500 dark:text-white/40 max-w-sm mx-auto">
                Invitez votre premier employé par email ci-dessus. Le Smart Dispatch lui distribuera automatiquement les commandes entrantes sur l&apos;ensemble de vos boutiques et funnels.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modale d'invitation ──────────────────────────────────────────────── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/[0.08]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <UserPlus className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Inviter au Call Center COD
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                  Adresse email du collaborateur
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="confirmateur@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-white/40 mt-1">
                  Une invitation lui sera présentée dès sa connexion. Dès qu&apos;il l&apos;accepte, le Smart Dispatch lui attribuera ses commandes.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                  Rôle attribué
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "manager",
                      label: "Confirmateur Call Center (Recommandé)",
                      desc: "Accès dédié au module Commandes pour appeler et valider les clients COD",
                    },
                    {
                      id: "support",
                      label: "Support Client",
                      desc: "Consultation des commandes et suivi des livraisons",
                    },
                    {
                      id: "admin",
                      label: "Administrateur",
                      desc: "Accès complet aux commandes et produits",
                    },
                  ].map((r) => (
                    <label
                      key={r.id}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        inviteRole === r.id
                          ? "border-purple-500 bg-purple-500/5 dark:bg-purple-500/10"
                          : "border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="role"
                        value={r.id}
                        checked={inviteRole === r.id}
                        onChange={() => setInviteRole(r.id as any)}
                        className="mt-0.5 text-purple-600 focus:ring-purple-500"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">
                          {r.label}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-white/50">
                          {r.desc}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-md shadow-purple-600/25 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Envoi en cours...</span>
                    </>
                  ) : (
                    <span>Envoyer l&apos;invitation</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modale de confirmation de suppression ────────────────────────────── */}
      {memberToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Retirer ce collaborateur ?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-white/70 leading-relaxed">
              Êtes-vous sûr de vouloir retirer <strong>{memberToDelete.email}</strong> de votre
              équipe ? Cette personne perdra immédiatement l&apos;accès à vos commandes et ne recevra plus de commandes attribuées.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-white/60 hover:bg-slate-100 dark:hover:bg-white/[0.05]"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/25 disabled:opacity-50"
              >
                {isDeleting ? "Suppression..." : "Confirmer le retrait"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modale d'Upgrade si clic par un utilisateur non-Business ─────────── */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        title="Passez au Pack Business 👥"
        description="Le Smart Dispatch et la gestion d'équipe call center est une exclusivité du Pack Business. Débloquez-la dès aujourd'hui !"
        currentPlan={userPlan.plan}
        recommendedPlan="business"
        limitType="team"
      />
    </div>
  );
}
