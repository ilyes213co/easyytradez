"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  UserCheck, 
  Plus, 
  ShieldCheck, 
  Truck, 
  Crown, 
  Trash2, 
  Mail, 
  Calendar,
  AlertCircle
} from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useCurrentStore } from "@/lib/current-store";
import { useAuth } from "@/components/auth/AuthProvider";
import type { StoreMember } from "@/lib/supabase";
import { toast } from "sonner";

const ROLE_INFO: Record<StoreMember["role"], { label: string; desc: string; icon: any; color: string; bg: string }> = {
  admin: {
    label: "Administrateur",
    desc: "Accès complet à la boutique, aux finances et à tous les paramètres.",
    icon: ShieldCheck,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/30",
  },
  manager: {
    label: "Gérant",
    desc: "Peut ajouter des produits, modifier les prix et valider les commandes.",
    icon: UserCheck,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
  },
  viewer: {
    label: "Livreur / Support",
    desc: "Peut uniquement voir les commandes et les adresses pour la livraison.",
    icon: Truck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
  },
};

export default function TeamPage() {
  const { currentStore } = useCurrentStore();
  const { user } = useAuth();
  const supabase = getSupabaseBrowserClient();

  const [members, setMembers] = useState<StoreMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StoreMember["role"]>("manager");
  const [submitting, setSubmitting] = useState(false);

  // Fetch team members
  const fetchMembers = useCallback(async () => {
    if (!currentStore?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_members")
        .select("*")
        .eq("store_id", currentStore.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMembers((data as StoreMember[]) || []);
    } catch {
      toast.error("Erreur lors de la lecture des membres");
    } finally {
      setLoading(false);
    }
  }, [currentStore?.id, supabase]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // Invite member
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id || !inviteEmail.trim()) {
      toast.error("Veuillez saisir une adresse email valide");
      return;
    }

    const email = inviteEmail.trim().toLowerCase();
    if (members.some((m) => m.user_email === email)) {
      toast.error("Ce collaborateur fait déjà partie de l'équipe");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("store_members")
        .insert({
          store_id: currentStore.id,
          user_email: email,
          role: inviteRole,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;

      setMembers((prev) => [...prev, data as StoreMember]);
      setInviteEmail("");
      toast.success("Collaborateur ajouté avec succès !");
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'ajouter le collaborateur");
    } finally {
      setSubmitting(false);
    }
  };

  // Remove member
  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Voulez-vous retirer ce collaborateur de votre boutique ?")) return;
    try {
      const { error } = await supabase
        .from("store_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
      toast.success("Collaborateur retiré");
    } catch {
      toast.error("Erreur lors du retrait");
    }
  };

  return (
    <div className="min-h-screen bg-[#060814] text-slate-100 p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-600/10">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">
                Mon Équipe & Collaborateurs
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Donnez accès à vos associés, préparateurs de commandes et livreurs en toute sécurité.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Invite card */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Inviter un nouveau membre</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Saisissez son adresse email et attribuez-lui le rôle adapté à ses responsabilités.
          </p>
        </div>

        <form onSubmit={handleInvite} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Adresse email du collaborateur
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="employe@exemple.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-all"
              />
            </div>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Rôle attribué
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as StoreMember["role"])}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-white outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="manager" className="bg-slate-900 text-white">Gérant (Produits & Commandes)</option>
              <option value="viewer" className="bg-slate-900 text-white">Livreur / Support (Commandes seules)</option>
              <option value="admin" className="bg-slate-900 text-white">Administrateur (Accès complet)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Ajout..." : "Inviter"}
            </button>
          </div>
        </form>
      </div>

      {/* Members list */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-white">Membres actuels ({members.length + 1})</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Owner Card (Always Present) */}
          <div className="rounded-2xl bg-white/[0.03] border border-amber-500/20 p-5 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                  {user?.email?.charAt(0).toUpperCase() || "P"}
                </div>
                <div>
                  <div className="text-xs font-bold text-white truncate max-w-[180px]">
                    {user?.email || "Propriétaire de la boutique"}
                  </div>
                  <div className="text-[11px] text-slate-400">Créateur du compte</div>
                </div>
              </div>

              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
                <Crown className="w-3 h-3" />
                <span>Propriétaire</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Titulaire principal de la boutique avec contrôle intégral.
            </p>
          </div>

          {/* Invited Members */}
          {members.map((m) => {
            const roleCfg = ROLE_INFO[m.role] || ROLE_INFO.manager;
            const RoleIcon = roleCfg.icon;

            return (
              <div
                key={m.id}
                className="rounded-2xl bg-white/[0.03] border border-white/[0.08] p-5 flex flex-col justify-between gap-4 hover:border-white/20 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-white font-bold text-sm">
                        {m.user_email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white truncate max-w-[160px]">
                          {m.user_email}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          <span>Ajouté le {new Date(m.created_at).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${roleCfg.bg} ${roleCfg.color}`}
                    >
                      <RoleIcon className="w-3 h-3" />
                      <span>{roleCfg.label}</span>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {roleCfg.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Accès actif
                  </span>

                  <button
                    onClick={() => handleRemoveMember(m.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Retirer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
