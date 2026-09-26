"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Settings, User, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/types/database";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useAuth } from "@/components/auth/AuthProvider";

interface Props {
  user: SupabaseUser;
  profile: Profile | null;
}

export default function DashboardHeader({ user, profile }: Props) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success("Déconnecté avec succès");
    } catch {
      router.push("/login");
    }
  };

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "ME";

  return (
    <header className="flex h-16 items-center justify-between border-b border-white/[0.08] bg-[#090b10]/95 backdrop-blur-xl px-6">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[#3b82f6] shadow-[0_0_6px_#3b82f6]" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-white/60">
          Command Center • E-Commerce Algérie
        </h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative rounded-xl p-2 text-white/50 hover:bg-white/[0.05] hover:text-white transition">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#3b82f6] shadow-[0_0_6px_#3b82f6]" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 transition hover:border-white/20 hover:bg-white/[0.06]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#07080c] border border-[#3b82f6]/40 text-xs font-bold text-[#3b82f6] shadow-[0_0_8px_rgba(59,130,246,0.25)]">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold text-white">{profile?.full_name ?? "Marchand Pro"}</p>
              <p className="text-[10px] text-white/40">{user.email}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-white/40" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1.5 w-56 rounded-2xl border border-white/10 bg-[#0d0f17] shadow-2xl backdrop-blur-xl p-1.5">
                <div className="border-b border-white/[0.08] px-3 py-2.5">
                  <p className="text-xs font-bold text-white">{profile?.full_name ?? "Marchand"}</p>
                  <p className="text-[11px] text-white/40 truncate">{user.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      router.push("/dashboard/settings");
                    }}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-white/70 hover:bg-white/[0.05] hover:text-white transition"
                  >
                    <Settings className="h-3.5 w-3.5 text-white/50" /> Paramètres
                  </button>
                  <div className="my-1 border-t border-white/[0.08]" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Déconnexion
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
