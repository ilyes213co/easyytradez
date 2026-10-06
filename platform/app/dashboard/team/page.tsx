"use client";

import { Users, UserPlus, Shield, Mail } from "lucide-react";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Mon Équipe</h1>
          <p className="text-white/60 text-sm mt-1">
            Gérez les accès, rôles et permissions des membres de votre équipe.
          </p>
        </div>

        <button
          disabled
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-accent/60 cursor-not-allowed shadow-lg self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Inviter un collaborateur</span>
        </button>
      </div>

      <div className="rounded-3xl border border-sky/20 bg-ink/80 p-8 space-y-6 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 border border-sky/30 flex items-center justify-center text-sky">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Gestion des Rôles & Accès</h3>
            <p className="text-xs text-white/50">
              Attribuez des permissions spécifiques pour vos funnels et boutiques (Administrateur, Gestionnaire des commandes, Support client).
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-sky/15 bg-white/[0.02] p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/30 border border-sky/40 flex items-center justify-center text-white text-xs font-bold">
              VO
            </div>
            <div>
              <p className="text-sm font-bold text-white">Propriétaire du compte</p>
              <p className="text-xs text-white/40">Accès complet à tous les funnels et boutiques</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Propriétaire
          </span>
        </div>
      </div>
    </div>
  );
}
