"use client";

import { useState, useEffect } from "react";
import { Headset, CheckCircle2, XCircle, Loader2, Sparkles, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useUserRole } from "@/lib/use-user-role";

interface InvitationItem {
  id: string;
  owner_id: string;
  owner_name: string;
  owner_email: string;
  store_id?: string | null;
  store_name?: string | null;
  role: string;
  status: string;
  created_at: string;
}

export function InvitationGateModal() {
  const router = useRouter();
  const userRole = useUserRole();

  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/team/invitations");
      if (res.ok) {
        const data = await res.json();
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      console.warn("Could not load invitations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Ne charger que si le hook signale des invitations en attente ou au chargement initial
    fetchInvitations();
  }, [userRole.hasPendingInvitations]);

  if (loading || invitations.length === 0) {
    return null;
  }

  const activeInvite = invitations[0];
  if (!activeInvite) {
    return null;
  }

  const handleResponse = async (action: "accept" | "reject") => {
    if (!activeInvite) return;
    setRespondingId(activeInvite.id);

    try {
      const res = await fetch("/api/team/invitations/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invitation_id: activeInvite.id,
          action,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.message || "Erreur de traitement");
      }

      if (action === "accept") {
        toast.success(data.message || "Invitation acceptée ! Redirection vers vos commandes...");
        // Recharger le rôle utilisateur
        userRole.refetch();
        // Mettre à jour l'état local
        setInvitations((prev) => prev.filter((i) => i.id !== activeInvite.id));
        // Rediriger vers l'espace confirmateur
        router.push("/dashboard/orders");
      } else {
        toast.info(data.message || "Invitation refusée.");
        userRole.refetch();
        setInvitations((prev) => prev.filter((i) => i.id !== activeInvite.id));
      }
    } catch (err: any) {
      toast.error(err.message || "Impossible de répondre à l'invitation.");
    } finally {
      setRespondingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c0d1e] border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Glow décoratif */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header avec Icône Headset */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-purple-500/30 shrink-0">
            <Headset className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 mb-1">
              <Sparkles className="w-3 h-3" />
              <span>Invitation en attente</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Rejoindre le Call Center COD
            </h2>
          </div>
        </div>

        {/* Détails de l'invitation */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] space-y-3">
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <strong>{activeInvite.owner_name}</strong>{" "}
            <span className="text-slate-500 dark:text-white/50">({activeInvite.owner_email})</span> vous invite à rejoindre son équipe de téléopérateurs de confirmation COD.
          </p>

          <div className="pt-2 border-t border-slate-200/60 dark:border-white/[0.06] grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-slate-400 dark:text-white/40 block">Rôle attribué :</span>
              <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                Confirmateur Call Center
              </span>
            </div>
            <div>
              <span className="text-slate-400 dark:text-white/40 block">Périmètre :</span>
              <span className="font-bold text-slate-800 dark:text-white truncate block mt-0.5">
                {activeInvite.store_name ? activeInvite.store_name : "Tous Funnels & Boutiques"}
              </span>
            </div>
          </div>
        </div>

        {/* Notice explicative */}
        <p className="text-xs text-slate-500 dark:text-white/50 leading-relaxed">
          En acceptant, vous accéderez directement à votre <strong>Espace Confirmateur</strong> où vous recevrez automatiquement vos commandes à appeler et valider via le Smart Dispatch.
        </p>

        {/* Boutons d'action */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleResponse("reject")}
            disabled={respondingId !== null}
            className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-xs font-bold text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200 dark:border-white/10 transition-colors disabled:opacity-50"
          >
            <XCircle className="w-4 h-4 text-rose-500" />
            <span>Refuser l&apos;invitation</span>
          </button>

          <button
            type="button"
            onClick={() => handleResponse("accept")}
            disabled={respondingId !== null}
            className="w-full sm:w-auto flex-[1.4] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-accent hover:opacity-95 shadow-lg shadow-purple-600/25 active:scale-95 transition-all disabled:opacity-50"
          >
            {respondingId === activeInvite.id ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Validation en cours...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Accepter et rejoindre</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
