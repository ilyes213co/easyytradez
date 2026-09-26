"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Package,
  ShoppingBag,
  BarChart2,
  Settings,
  Plus,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

const NAV = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Ma boutique", href: "/dashboard/store", icon: Store },
  { label: "Catalogue", href: "/dashboard/products", icon: Package },
  { label: "Commandes COD", href: "/dashboard/orders", icon: ShoppingBag },
  { label: "Statistiques & ROI", href: "/dashboard/analytics", icon: BarChart2 },
  { label: "Paramètres", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-white/[0.08] bg-[#090b10] lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-white/[0.08] px-5">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#07080c] border border-[#3b82f6]/40 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
          <Zap className="h-4 w-4 text-[#3b82f6] fill-[#3b82f6]/20" />
        </div>
        <span className="text-base font-bold text-white tracking-tight">
          easy<span className="text-blue-400 font-extrabold">trade</span>
        </span>
      </div>

      {/* Create store CTA */}
      <div className="px-4 pt-5">
        <Link
          href="/dashboard/create-store"
          prefetch={true}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-[0_0_15px_rgba(59,130,246,0.35)] transition hover:shadow-[0_0_25px_rgba(59,130,246,0.5)]"
        >
          <Plus className="h-4 w-4" />
          Nouvelle boutique
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 pt-4">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              prefetch={true}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all",
                active
                  ? "bg-[#3b82f6]/10 text-white border border-[#3b82f6]/30 shadow-[inset_0_0_10px_rgba(59,130,246,0.15)] font-semibold"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-[#3b82f6]" : "text-white/40 group-hover:text-white")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Plan badge */}
      <div className="p-4 border-t border-white/[0.08]">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-white/50">Plan actif</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                profile?.plan === "pro"
                  ? "bg-[#3b82f6]/20 text-[#3b82f6] border border-[#3b82f6]/30"
                  : "bg-white/10 text-white/70"
              )}
            >
              {profile?.plan === "pro" ? "Pro AI" : "Standard"}
            </span>
          </div>
          {profile?.plan !== "pro" && (
            <Link
              href="/dashboard/upgrade"
              prefetch={true}
              className="mt-2.5 block text-center rounded-xl bg-white/[0.05] border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:border-[#3b82f6]/40 hover:bg-[#3b82f6]/10 transition"
            >
              Passer au Pro
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
