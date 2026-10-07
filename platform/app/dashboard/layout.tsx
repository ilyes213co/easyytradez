"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

import { Menu, X } from "lucide-react";
import EasyTradeLogo from "@/components/brand/EasyTradeLogo";
import SidebarNav from "@/components/dashboard/SidebarNav";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Close mobile drawer on route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent background scrolling when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-ink flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink text-slate-900 dark:text-white flex flex-col lg:flex-row selection:bg-accent selection:text-white transition-colors duration-200">
      {/* ─── Mobile Header (< lg) ─── */}
      <header className="lg:hidden sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#070712]/95 backdrop-blur-xl border-b border-slate-200/80 dark:border-white/[0.08] px-4 flex items-center justify-between shadow-xs transition-colors duration-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu de navigation"
            className="p-2 -ml-1.5 rounded-xl text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-95 transition-all"
          >
            <Menu className="w-6 h-6" />
          </button>
          <EasyTradeLogo size={28} href="/dashboard" />
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <span className="text-[10px] font-semibold text-accent dark:text-sky-light/90 bg-accent/10 dark:bg-accent/20 px-2.5 py-1 rounded-full border border-accent/20 dark:border-sky/30 tracking-wider font-mono">
            PRO
          </span>
        </div>
      </header>

      {/* ─── Mobile Drawer (< lg) ─── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              aria-hidden="true"
            />

            {/* Sliding Drawer */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 260 }}
              className="absolute top-0 bottom-0 left-0 w-[280px] max-w-[85vw] bg-white dark:bg-[#070712] border-r border-slate-200/80 dark:border-white/[0.08] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200/80 dark:border-white/[0.07] shrink-0">
                <EasyTradeLogo size={28} href="/dashboard" />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Fermer le menu"
                  className="p-2 -mr-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-white/60 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06] active:scale-95 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Sidebar Content */}
              <SidebarNav onNavigate={() => setMobileMenuOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Desktop Sidebar (lg+) ─── */}
      <aside className="hidden lg:flex w-64 shrink-0 border-r border-slate-200/80 dark:border-white/[0.08] bg-white/95 dark:bg-[#070712]/95 backdrop-blur-2xl flex-col h-screen sticky top-0 relative z-30 shadow-[1px_0_20px_rgba(0,0,0,0.04)] dark:shadow-[1px_0_30px_rgba(0,0,0,0.45)] transition-colors duration-200">
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

      {/* ─── Main Content ─── */}
      <main className="flex-1 min-w-0 overflow-y-auto bg-slate-50 dark:bg-ink min-h-[calc(100vh-4rem)] lg:min-h-screen transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-3.5 py-4 sm:px-6 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}