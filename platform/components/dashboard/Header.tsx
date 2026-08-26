"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, LogOut, Settings, User } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase";
import type { Profile } from "@/types/database";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface Props {
  user: SupabaseUser;
  profile: Profile | null;
}

export default function DashboardHeader({ user, profile }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnecté avec succès");
    router.push("/login");
    router.refresh();
  };

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "??";

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-medium text-gray-500">Tableau de bord</h2>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition">
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-primary-600" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 transition hover:bg-gray-50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
              {initials}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-sm font-medium text-gray-800">{profile?.full_name ?? "Marchand"}</p>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-20 mt-1 w-52 rounded-xl border border-gray-100 bg-white shadow-lg">
                <div className="border-b border-gray-100 p-3">
                  <p className="text-xs font-medium text-gray-800">{profile?.full_name}</p>
                  <p className="text-xs text-gray-400">{user.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => { setMenuOpen(false); router.push("/dashboard/profile"); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" /> Mon profil
                  </button>
                  <button
                    onClick={() => { setMenuOpen(false); router.push("/dashboard/settings"); }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
                  >
                    <Settings className="h-4 w-4" /> Paramètres
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" /> Déconnexion
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
