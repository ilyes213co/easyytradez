"use client";

import { useEffect, useState, useCallback } from "react";
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
  Trash2,
  Loader2,
  AlertTriangle,
  Store as StoreIcon,
  UserCheck,
  Clock,
  X,
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

interface TeamMember {
  id: string;
  store_id: string;
  email: string;
  user_email?: string;
  role: "admin" | "manager" | "editor" | "support" | "viewer";
  status: "active" | "invited" | "pending";
  created_at: string;
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
    label: "Gestionnaire",
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
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "manager" | "support">("manager");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation State
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Upgrade Modal State (for non-business accounts clicking CTA)
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
        if (list.length > 0 && list[0]) {
          setSelectedStoreId(list[0].id);
        }
      } catch (err) {
        console.warn("Could not load user stores:", err);
      }
    }
    loadStores();
  }, [user, supabase]);

  // 2. Fetch team members when store is selected and user is Business
  const loadMembers = useCallback(async () => {
    if (!selectedStoreId || !userPlan.isBusiness) return;
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/team?store_id=${selectedStoreId}`);
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Erreur lors du chargement des membres");
      }
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err: any) {
      console.warn("Error loading team members:", err.message);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }, [selectedStoreId, userPlan.isBusiness]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  // 3. Handle Add Member
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedStoreId) {
      toast.error("Veuillez saisir une adresse email valide");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          store_id: selectedStoreId,
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

  // 4. Handle Delete Member
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/team/${memberToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || "Erreur lors de la suppression");
      }

      toast.success("Collaborateur retiré de la boutique");
      setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id));
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
      {/* ── En-tête ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
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
              {isBusiness ? "Pack Business Actif" : "Exclusivité Business"}
            </span>
          </div>
          <p className="text-slate-500 dark:text-white/60 text-sm mt-1">
            Gérez les accès, rôles et permissions des collaborateurs de vos boutiques.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {stores.length > 1 && isBusiness && (
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 dark:text-white/80 focus:border-purple-500 outline-none shadow-sm"
            >
              {stores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.type === "funnel" ? "Funnel" : "Boutique"})
                </option>
              ))}
            </select>
          )}

          {isBusiness ? (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Inviter un collaborateur</span>
            </button>
          ) : (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-500/25 active:scale-95 transition-all"
            >
              <Crown className="w-4 h-4" />
              <span>Passer au Pack Business</span>
            </button>
          )}
        </div>
      </div>

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
                Déléguez et pilotez vos ventes avec votre équipe 👥
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

      {/* ── Liste des membres & Rôles ────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#0c0d1c] p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Membres et Permissions de l&apos;Équipe
              </h3>
              <p className="text-xs text-slate-500 dark:text-white/50">
                {isBusiness
                  ? `Membres enregistrés sur « ${stores.find((s) => s.id === selectedStoreId)?.name || "la boutique"} »`
                  : "Visualisez la structure des permissions de vos boutiques"}
              </p>
            </div>
          </div>

          {isBusiness && (
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/70 border border-slate-200 dark:border-white/10">
              {members.length + 1} {members.length + 1 > 1 ? "membres" : "membre"}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* Carte Propriétaire (Compte principal) */}
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
                  Propriétaire légal du compte — Accès total et irrévocable
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
              <UserCheck className="w-3 h-3" />
              <span>Propriétaire</span>
            </span>
          </div>

          {/* Liste des membres invités (si Business) */}
          {isBusiness && loadingMembers && (
            <div className="p-8 text-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
              <p className="text-xs">Chargement des collaborateurs...</p>
            </div>
          )}

          {isBusiness &&
            !loadingMembers &&
            members.map((member) => {
              const roleInfo =
                ROLE_CONFIGS[member.role] ?? {
                  label: "Collaborateur",
                  desc: "Membre de l'équipe",
                  badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
                };
              const displayEmail = member.email || member.user_email || "";
              return (
                <div
                  key={member.id}
                  className="rounded-2xl border border-slate-100 dark:border-white/[0.05] bg-white dark:bg-[#0c0d1c] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-slate-200 dark:hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-white/[0.08] text-slate-700 dark:text-white/80 font-bold flex items-center justify-center text-xs uppercase">
                      {displayEmail.slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">
                          {displayEmail}
                        </p>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleInfo.badge}`}
                        >
                          {roleInfo.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-white/40">
                        {roleInfo.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-white/40">
                      <Clock className="w-3 h-3" />
                      <span>
                        {member.status === "active" ? "Actif" : "Invitation en attente"}
                      </span>
                    </span>

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
              );
            })}

          {isBusiness && !loadingMembers && members.length === 0 && (
            <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400">
              <Users className="w-8 h-8 mx-auto text-slate-300 dark:text-white/20 mb-2" />
              <p className="text-sm font-semibold text-slate-700 dark:text-white/70">
                Aucun collaborateur invité sur cette boutique
              </p>
              <p className="text-xs text-slate-500 dark:text-white/40 mt-1 max-w-sm mx-auto">
                Ajoutez vos associés ou agents de confirmation COD pour collaborer en direct.
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
                  Inviter un Collaborateur
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
                    placeholder="associe@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] text-slate-900 dark:text-white focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-white/80 mb-1.5">
                  Rôle et permissions
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "admin",
                      label: "Administrateur",
                      desc: "Accès complet aux produits, commandes et réglages",
                    },
                    {
                      id: "manager",
                      label: "Gestionnaire (Confirmation COD)",
                      desc: "Peut confirmer, modifier et expédier les commandes",
                    },
                    {
                      id: "support",
                      label: "Support Client",
                      desc: "Consultation des commandes et suivi des livraisons",
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
              Êtes-vous sûr de vouloir retirer{" "}
              <strong>{memberToDelete.email || memberToDelete.user_email}</strong> de cette
              boutique ? Cette personne perdra immédiatement l&apos;accès à vos commandes et données.
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
        description="La gestion d'équipe et des permissions multi-collaborateurs est une exclusivité du Pack Business. Débloquez-la pour inviter vos équipes dès aujourd'hui !"
        currentPlan={userPlan.plan}
        recommendedPlan="business"
        limitType="team"
      />
    </div>
  );
}
