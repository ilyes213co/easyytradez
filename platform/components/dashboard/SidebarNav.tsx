"use client";

import { memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Layers, 
  PlusCircle, 
  Store, 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Truck, 
  Settings,
  Users,
  UserCheck
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Command Center", icon: LayoutDashboard },
  { href: "/dashboard/stores", label: "Mes Boutiques", icon: Layers },
  { href: "/dashboard/create-store", label: "Créer une boutique", icon: PlusCircle },
  { href: "/dashboard/store", label: "Boutique Active", icon: Store },
  { href: "/dashboard/products", label: "Catalogue Produits", icon: Package },
  { href: "/dashboard/orders", label: "Commandes COD", icon: ShoppingCart },
  { href: "/dashboard/team", label: "Mon Équipe", icon: UserCheck },
  { href: "/dashboard/analytics", label: "Analytics & ROI", icon: BarChart3 },
  { href: "/dashboard/delivery", label: "Expéditions 58 Wilayas", icon: Truck },
  { href: "/dashboard/settings", label: "Paramètres", icon: Settings },
];

function SidebarNavInner() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-1.5 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const isActive = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname === item.href || pathname.startsWith(`${item.href}/`) || (item.href === "/dashboard/store" && pathname.startsWith("/dashboard/store"));
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            className={`group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
              isActive
                ? "bg-gradient-to-r from-blue-600/30 to-blue-900/20 text-white border border-blue-500/30 shadow-lg shadow-blue-900/20"
                : "text-slate-400 hover:text-white hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            {/* Laser Active Edge */}
            {isActive && (
              <div className="absolute left-0 top-2 bottom-2 w-1 bg-blue-500 rounded-r-full shadow-[0_0_8px_#3b82f6]" />
            )}
            <Icon 
              className={`h-4 w-4 transition-all duration-200 group-hover:scale-110 ${
                isActive ? "text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.5)]" : "text-slate-400 group-hover:text-white"
              }`} 
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export const SidebarNav = memo(SidebarNavInner);
SidebarNav.displayName = "SidebarNav";
