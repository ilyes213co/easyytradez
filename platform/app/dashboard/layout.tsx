"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { StoreSwitcher } from "@/components/dashboard/StoreSwitcher";
import { MobileBottomTab } from "@/components/dashboard/MobileBottomTab";
import { NavigationProgress } from "@/components/dashboard/NavigationProgress";
import Link from "next/link";
import { LogOut } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "NL";
  const userEmail = user?.email ?? "marchand@easytrade.dz";

  return (
    <RequireAuth>
      <NavigationProgress />
      <div className="min-h-screen bg-[#06060f] text-slate-100 flex selection:bg-blue-600 selection:text-white relative overflow-x-clip">
        {/* Subtle Sapphire Grid Background */}
        <div className="fixed inset-0 pointer-events-none z-0" aria-hidden>
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="absolute top-0 left-1/4 w-[600px] h-[350px] bg-gradient-to-b from-[#2540ea]/15 to-transparent blur-[80px] pointer-events-none" />
        </div>

        {/* Sidebar Desktop */}
        <aside className="relative z-20 hidden md:flex w-64 shrink-0 border-r border-blue-900/25 bg-[#070918]/90 backdrop-blur-md flex-col justify-between shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
          <div className="p-5 flex flex-col gap-6">
            {/* Brand Header */}
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 text-white font-black text-xl tracking-tight group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon-white.png"
                  alt="EasyTrade"
                  className="w-8 h-auto object-contain flex-shrink-0 transition-transform group-hover:scale-105"
                />
                <span className="text-lg font-bold tracking-tight">Easy<span className="text-blue-400 font-extrabold">Trade</span></span>
              </Link>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE
              </span>
            </div>

            {/* Store Switcher */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400/80 mb-1.5 block px-0.5">Boutique Active</label>
              <StoreSwitcher />
            </div>

            {/* Navigation List */}
            <SidebarNav />
          </div>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-blue-900/25 bg-[#050714]/80 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-xs text-white shadow-md shadow-blue-900/40 flex-shrink-0" suppressHydrationWarning>
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate" suppressHydrationWarning>{userEmail}</p>
                <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Merchant Pro
                </span>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="p-2 text-slate-400 hover:text-white hover:bg-white/[0.06] rounded-lg transition-colors"
              title="Déconnexion"
              aria-label="Déconnexion"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* Mobile Top Header with Store Switcher */}
        <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-blue-900/25 bg-[#070918]/95 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-white.png"
              alt="EasyTrade"
              className="w-6 h-auto object-contain flex-shrink-0"
            />
            <span className="text-sm font-bold text-white">Easy<span className="text-blue-400 font-extrabold">Trade</span></span>
          </div>
          <div className="flex-1 max-w-[220px]">
            <StoreSwitcher />
          </div>
        </div>

        {/* Main Content Area */}
        <main className="relative z-10 flex-1 min-w-0 pb-20 md:pb-0">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {children}
          </div>
        </main>

        {/* Mobile Navigation */}
        <MobileBottomTab />
      </div>
    </RequireAuth>
  );
}
