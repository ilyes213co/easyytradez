"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { motion } from "framer-motion";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/dashboard/create-store", label: "Créer une boutique", icon: "＋" },
  { href: "/dashboard/store", label: "Ma boutique", icon: "🏪" },
  { href: "/dashboard/products", label: "Produits", icon: "📦" },
  { href: "/dashboard/orders", label: "Commandes", icon: "🛒" },
  { href: "/dashboard/stats", label: "Statistiques", icon: "📈" },
  { href: "/dashboard/delivery", label: "Livraison", icon: "🚚" },
  { href: "/dashboard/settings", label: "Paramètres", icon: "⚙️" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const initials = user.email?.slice(0, 2).toUpperCase() ?? "??";

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-white/[0.06]">
          <span className="text-white font-bold text-lg">Marchand</span>
          <span className="ml-1 text-indigo-400 font-bold text-lg">.dz</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${isActive
                    ? "text-indigo-300 font-medium"
                    : "text-white/50 hover:text-white/80 hover:bg-white/[0.04]"
                  }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {isActive && (
                  <motion.div
                    layoutId="active-bar"
                    className="absolute left-0 w-1 h-5 bg-indigo-500 rounded-r-full"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className={`relative text-base transition-transform group-hover:scale-110 duration-200 ${isActive ? "text-indigo-400" : ""}`}>
                  {item.icon}
                </span>
                <span className="relative">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-xs font-bold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white/70 text-sm truncate">{user.email}</p>
            </div>
            <button
              onClick={() => signOut()}
              className="text-white/30 hover:text-white/70 transition-colors text-xs"
              title="Déconnexion"
            >
              ⏻
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}