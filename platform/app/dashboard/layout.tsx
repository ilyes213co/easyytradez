"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { motion } from "framer-motion";

import { LogOut } from "lucide-react";
import EasyTradeLogo from "@/components/brand/EasyTradeLogo";
import SidebarNav from "@/components/dashboard/SidebarNav";
import ThemeToggle from "@/components/theme/ThemeToggle";

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
      <div className="min-h-screen bg-slate-50 dark:bg-ink flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink text-slate-900 dark:text-white flex selection:bg-accent selection:text-white transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#070712]/95 backdrop-blur-2xl flex flex-col h-screen sticky top-0 relative z-30 shadow-[1px_0_20px_rgba(0,0,0,0.04)] dark:shadow-[1px_0_30px_rgba(0,0,0,0.45)] transition-colors duration-200">
        {/* Subtle ambient light gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/[0.02] dark:from-accent/[0.04] via-transparent to-transparent" />

        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 dark:border-white/[0.07] relative z-10 shrink-0">
          <EasyTradeLogo size={30} href="/dashboard" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-[10px] font-semibold text-accent dark:text-sky-light/90 bg-accent/10 dark:bg-accent/20 px-2 py-0.5 rounded-full border border-accent/20 dark:border-sky/30 tracking-wider font-mono">
              PRO
            </span>
          </div>
        </div>

        {/* Dynamic Sidebar Nav */}
        <SidebarNav />
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-ink min-h-screen transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}