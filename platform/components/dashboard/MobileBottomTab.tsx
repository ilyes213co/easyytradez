"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, ShoppingCart, BarChart3, MoreHorizontal } from "lucide-react";

const TABS = [
  { href: "/dashboard", label: "Command", Icon: Home },
  { href: "/dashboard/products", label: "Produits", Icon: Package },
  { href: "/dashboard/orders", label: "Commandes", Icon: ShoppingCart },
  { href: "/dashboard/analytics", label: "Stats", Icon: BarChart3 },
  { href: "/dashboard/settings", label: "Plus", Icon: MoreHorizontal },
] as const;

export function MobileBottomTab() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navigation mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 h-14 bg-[#070918]/95 backdrop-blur-xl border-t border-blue-900/25 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="h-full flex">
        {TABS.map(({ href, label, Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/dashboard" && (pathname?.startsWith(href) ?? false));
          return (
            <li key={href} className="flex-1 relative">
              <Link
                href={href}
                prefetch={true}
                aria-current={isActive ? "page" : undefined}
                className={`h-full w-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? "text-blue-400 font-semibold" : "text-white/40 hover:text-white/70"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-b bg-blue-500 shadow-[0_0_8px_#3b82f6]" />
                )}
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
                <span className="text-[10px] leading-none">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
