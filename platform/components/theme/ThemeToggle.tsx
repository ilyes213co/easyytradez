"use client";

import { useTheme } from "@/components/theme/ThemeProvider";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/[0.04] text-slate-600 dark:text-white/70 hover:text-accent dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all duration-200 shadow-sm ${className}`}
      title={theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre"}
      aria-label="Changer le thème"
    >
      {theme === "dark" ? (
        <Sun className="w-3.5 h-3.5 text-amber-400 transition-transform hover:rotate-45" />
      ) : (
        <Moon className="w-3.5 h-3.5 text-accent transition-transform hover:-rotate-12" />
      )}
    </button>
  );
}
