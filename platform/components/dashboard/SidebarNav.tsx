"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Home,
  Package,
  Tag,
  Users,
  Layers,
  BarChart2,
  Settings,
  Store,
  ChevronRight,
  LogOut,
} from "lucide-react";
import StoreSwitcher from "@/components/dashboard/StoreSwitcher";
import { useAuth } from "@/components/auth/AuthProvider";

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
}

const FUNNEL_ITEMS: NavItemConfig[] = [
  { label: "Accueil",      href: "/dashboard?section=funnel",  icon: Home, exact: true },
  { label: "Commandes",    href: "/dashboard/funnel/orders",   icon: Package },
  { label: "Produits",     href: "/dashboard/funnel/products", icon: Tag },
  { label: "Leads",        href: "/dashboard/team",            icon: Users },
  { label: "Funnels",      href: "/dashboard/funnel",          icon: Layers, exact: true },
  { label: "Analytiques",  href: "/dashboard/analytics?section=funnel", icon: BarChart2 },
];

const BOUTIQUE_ITEMS: NavItemConfig[] = [
  { label: "Accueil",      href: "/dashboard?section=boutique", icon: Home, exact: true },
  { label: "Commandes",    href: "/dashboard/boutique/orders",   icon: Package },
  { label: "Produits",     href: "/dashboard/boutique/products", icon: Tag },
  { label: "Leads",        href: "/dashboard/team",              icon: Users },
  { label: "Boutique",     href: "/dashboard/boutique",          icon: Store, badge: "Beta", exact: true },
  { label: "Analytiques",  href: "/dashboard/analytics?section=boutique", icon: BarChart2 },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, signOut } = useAuth();

  const sectionParam = searchParams.get("section");

  // Deduce active section from current route or search param
  const [activeTab, setActiveTab] = useState<"funnels" | "boutiques">(() => {
    if (pathname.startsWith("/dashboard/boutique") || sectionParam === "boutique") {
      return "boutiques";
    }
    if (pathname.startsWith("/dashboard/funnel") || sectionParam === "funnel") {
      return "funnels";
    }
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("active_section");
      if (saved === "boutiques") return "boutiques";
      if (saved === "funnels") return "funnels";
    }
    return "funnels";
  });

  // Keep tab synced with route
  useEffect(() => {
    if (pathname.startsWith("/dashboard/boutique")) {
      setActiveTab("boutiques");
      if (typeof window !== "undefined") localStorage.setItem("active_section", "boutiques");
    } else if (pathname.startsWith("/dashboard/funnel")) {
      setActiveTab("funnels");
      if (typeof window !== "undefined") localStorage.setItem("active_section", "funnels");
    } else if (sectionParam === "boutique") {
      setActiveTab("boutiques");
      if (typeof window !== "undefined") localStorage.setItem("active_section", "boutiques");
    } else if (sectionParam === "funnel") {
      setActiveTab("funnels");
      if (typeof window !== "undefined") localStorage.setItem("active_section", "funnels");
    }
  }, [pathname, sectionParam]);

  const handleTabChange = (tab: "funnels" | "boutiques") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      localStorage.setItem("active_section", tab);
    }
    const targetType = tab === "funnels" ? "funnel" : "boutique";

    if (pathname === "/dashboard") {
      router.push(`/dashboard?section=${targetType}`);
    } else if (pathname === "/dashboard/analytics") {
      router.push(`/dashboard/analytics?section=${targetType}`);
    } else if (tab === "funnels" && pathname.startsWith("/dashboard/boutique")) {
      if (pathname.includes("/products")) router.push("/dashboard/funnel/products");
      else if (pathname.includes("/orders")) router.push("/dashboard/funnel/orders");
      else router.push("/dashboard/funnel");
    } else if (tab === "boutiques" && pathname.startsWith("/dashboard/funnel")) {
      if (pathname.includes("/products")) router.push("/dashboard/boutique/products");
      else if (pathname.includes("/orders")) router.push("/dashboard/boutique/orders");
      else router.push("/dashboard/boutique");
    }
  };

  const navItems = activeTab === "funnels" ? FUNNEL_ITEMS : BOUTIQUE_ITEMS;

  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "benadjina ilyes";

  const initial = displayName.charAt(0).toUpperCase() || "B";

  const renderNavItem = (item: NavItemConfig) => {
    const [itemPath, itemQuery] = item.href.split("?");
    let isActive = false;

    if (itemPath === "/dashboard") {
      if (pathname === "/dashboard") {
        if (itemQuery) {
          const expectedSection = itemQuery.includes("funnel") ? "funnel" : "boutique";
          isActive = sectionParam === expectedSection || (!sectionParam && ((activeTab === "funnels" && expectedSection === "funnel") || (activeTab === "boutiques" && expectedSection === "boutique")));
        } else {
          isActive = true;
        }
      }
    } else if (itemPath === "/dashboard/analytics") {
      if (pathname === "/dashboard/analytics") {
        if (itemQuery) {
          const expectedSection = itemQuery.includes("funnel") ? "funnel" : "boutique";
          isActive = sectionParam === expectedSection || (!sectionParam && ((activeTab === "funnels" && expectedSection === "funnel") || (activeTab === "boutiques" && expectedSection === "boutique")));
        } else {
          isActive = true;
        }
      }
    } else if (item.exact) {
      isActive = pathname === itemPath;
    } else {
      isActive = pathname === itemPath || pathname.startsWith(itemPath + "/");
    }

    const Icon = item.icon;

    return (
      <Link
        key={item.label}
        href={item.href}
        className={`group relative flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
          isActive
            ? "bg-accent/10 dark:bg-accent/20 text-accent dark:text-white font-semibold border border-accent/25 dark:border-sky/30 shadow-sm"
            : "text-slate-600 dark:text-white/60 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.04] hover:translate-x-0.5"
        }`}
      >
        {isActive && (
          <div className="absolute left-0 w-1 h-4 bg-accent dark:bg-gradient-to-b dark:from-sky dark:via-accent dark:to-accent rounded-r-full shadow-[0_0_8px_rgba(37,64,234,0.4)] dark:shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
        )}
        <Icon
          className={`relative w-4 h-4 transition-transform duration-150 group-hover:scale-105 shrink-0 ${
            isActive ? "text-accent dark:text-sky" : "text-slate-400 dark:text-white/45 group-hover:text-slate-700 dark:group-hover:text-white/80"
          }`}
        />
        <span className="relative truncate">{item.label}</span>
        {item.badge && (
          <span className="relative ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/15 dark:bg-accent/25 text-accent dark:text-sky-light border border-accent/25 dark:border-sky/30 tracking-wide">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  return (
    <div className="flex-1 flex flex-col justify-between overflow-hidden">
      {/* Top Controls & Navigation Items */}
      <div className="flex-1 flex flex-col px-3 py-3 space-y-3 overflow-y-auto custom-scrollbar">
        {/* Top Segmented Switcher */}
        <div className="p-1 rounded-2xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/[0.08] flex items-center gap-1 shadow-inner shrink-0">
          <button
            type="button"
            onClick={() => handleTabChange("funnels")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
              activeTab === "funnels"
                ? "bg-accent text-white shadow-md shadow-accent/20 border border-accent/30"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.03]"
            }`}
          >
            <Layers className={`w-3.5 h-3.5 ${activeTab === "funnels" ? "text-white dark:text-sky-light" : "text-slate-400 dark:text-white/40"}`} />
            <span>Funnels</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("boutiques")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-150 ${
              activeTab === "boutiques"
                ? "bg-accent text-white shadow-md shadow-accent/20 border border-accent/30"
                : "text-slate-600 dark:text-white/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.03]"
            }`}
          >
            <Store className={`w-3.5 h-3.5 ${activeTab === "boutiques" ? "text-white dark:text-sky-light" : "text-slate-400 dark:text-white/40"}`} />
            <span>Boutiques</span>
          </button>
        </div>

        {/* Active Store / Funnel Switcher */}
        <div className="shrink-0">
          <StoreSwitcher typeOverride={activeTab === "funnels" ? "funnel" : "boutique"} />
        </div>

        {/* Navigation Links - Solid rendering with no disappearing items */}
        <nav className="space-y-0.5 pt-1">
          <div className="space-y-0.5">
            {navItems.map(renderNavItem)}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200/80 dark:border-white/[0.07] my-2 mx-1" />

          {/* Paramètres Link */}
          {renderNavItem({
            label: "Paramètres",
            href: "/dashboard/settings",
            icon: Settings,
          })}
        </nav>
      </div>

      {/* Bottom Upgrade Card & User Profile */}
      <div className="p-3 border-t border-slate-200/80 dark:border-white/[0.07] bg-slate-50/50 dark:bg-white/[0.015] relative z-10 shrink-0">
        <div className="rounded-2xl p-2.5 bg-gradient-to-b from-indigo-50/80 dark:from-accent/15 via-white/50 dark:via-accent/5 to-slate-50/50 dark:to-white/[0.02] border border-indigo-100 dark:border-sky/20 shadow-sm dark:shadow-lg space-y-2">
          {/* Upgrade button */}
          <Link
            href="/dashboard/upgrade"
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-white dark:bg-white/[0.06] hover:bg-slate-50 dark:hover:bg-white/[0.1] border border-slate-200/80 dark:border-white/10 transition-all text-xs font-semibold text-slate-800 dark:text-white group shadow-sm"
          >
            <span className="truncate">Mettre à niveau vers</span>
            <span className="bg-accent text-white px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide shadow-sm group-hover:bg-accent/90 transition-colors shrink-0 ml-2">
              Pro
            </span>
          </Link>

          {/* User profile row */}
          <div className="flex items-center justify-between pt-1 px-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-accent text-white font-bold flex items-center justify-center text-xs shrink-0 border border-accent/30 dark:border-sky/30 shadow-sm">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-800 dark:text-white/90 truncate leading-tight">
                  {displayName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Link
                href="/dashboard/settings"
                title="Paramètres"
                className="text-slate-400 dark:text-white/40 hover:text-slate-700 dark:hover:text-white p-1 rounded-md transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Link>
              <button
                onClick={() => signOut()}
                className="text-slate-400 dark:text-white/40 hover:text-rose-500 p-1 rounded-md transition-colors"
                title="Déconnexion"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
