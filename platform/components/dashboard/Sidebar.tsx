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
  { label: "Tableau de bord", href: "/dashboard",           icon: LayoutDashboard },
  { label: "Ma boutique",     href: "/dashboard/store",     icon: Store },
  { label: "Produits",        href: "/dashboard/products",  icon: Package },
  { label: "Commandes",       href: "/dashboard/orders",    icon: ShoppingBag },
  { label: "Statistiques",    href: "/dashboard/analytics", icon: BarChart2 },
  { label: "Paramètres",      href: "/dashboard/settings",  icon: Settings },
];

export default function DashboardSidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 flex-shrink-0 flex-col border-r border-gray-100 bg-white lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-gray-100 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
          <Zap className="h-4 w-4 text-white" />
        </div>
        <span className="text-[15px] font-semibold text-gray-900">StoreGen</span>
      </div>

      {/* Create store CTA */}
      <div className="px-4 pt-5">
        <Link
          href="/dashboard/create-store"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-primary-800"
        >
          <Plus className="h-4 w-4" />
          Nouvelle boutique
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3 pt-4">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active =
            href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary-50 text-primary-700"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <Icon className={cn("h-4 w-4", active ? "text-primary-600" : "text-gray-400")} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Plan badge */}
      <div className="p-4">
        <div className="rounded-xl bg-gray-50 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Plan actuel</span>
            <span className={cn(
              "rounded-full px-2 py-0.5 text-xs font-semibold",
              profile?.plan === "pro"
                ? "bg-amber-100 text-amber-700"
                : "bg-gray-200 text-gray-600"
            )}>
              {profile?.plan === "pro" ? "Pro" : "Gratuit"}
            </span>
          </div>
          {profile?.plan !== "pro" && (
            <Link
              href="/dashboard/upgrade"
              className="mt-2 block text-center rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800"
            >
              Passer au Pro
            </Link>
          )}
        </div>
      </div>
    </aside>
  );
}
