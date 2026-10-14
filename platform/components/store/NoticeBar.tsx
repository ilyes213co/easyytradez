"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, ShoppingBag, Home, PhoneCall, Tag } from "lucide-react";
import type { StoreContentOverrides } from "@/types/store";

interface NoticeBarProps {
  slug: string;
  categories: string[];
  activeCategory?: string;
  config?: StoreContentOverrides["notice_bar"];
}

export default function NoticeBar({
  slug,
  categories,
  activeCategory,
  config,
}: NoticeBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeAnchor, setActiveAnchor] = useState<string>("#top");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Active section scroll-spy
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + 120;
      const contactElem = document.getElementById("contact");
      const catalogueElem = document.getElementById("catalogue");

      if (contactElem && scrollPos >= contactElem.offsetTop) {
        setActiveAnchor("#contact");
      } else if (catalogueElem && scrollPos >= catalogueElem.offsetTop) {
        setActiveAnchor("#catalogue");
      } else {
        setActiveAnchor("#top");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Smooth scroll handler with offset compensation for fixed headers
  const handleScrollTo = (anchorId: string) => {
    if (anchorId === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      setActiveAnchor("#top");
      return;
    }

    const cleanId = anchorId.replace(/^#/, "");
    const elem = document.getElementById(cleanId);
    if (elem) {
      const headerOffset = 70;
      const elementPosition = elem.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });
      setActiveAnchor(anchorId);
    }
  };

  const isSticky = config?.sticky !== false;

  return (
    <div
      className={`w-full border-b border-[var(--border)] bg-[var(--surface)] text-[var(--text)] transition-all z-20 ${
        isSticky ? "sticky top-0 backdrop-blur-md bg-opacity-95 dark:bg-opacity-95" : "relative"
      }`}
      style={{
        borderColor: "var(--border)",
        backgroundColor: "var(--surface)",
        color: "var(--text)",
      }}
    >
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-4 py-2 sm:px-6">
        {/* Navigation Buttons avec défilement fluide (Smooth Scrolling) */}
        <nav
          className="flex items-center gap-1 sm:gap-2.5 text-xs font-semibold"
          aria-label="Navigation rapide"
        >
          {/* Dynamic Navigation Links with smooth-scrolling */}
          {(() => {
            const configuredLinks = config?.links?.length
              ? config.links.filter((l) => l.enabled !== false)
              : [
                  { id: "home", label: "Accueil", target_anchor: "#top", enabled: true },
                  { id: "products", label: "Produits", target_anchor: "#catalogue", enabled: true },
                  { id: "contact", label: "Contact", target_anchor: "#contact", enabled: true },
                ];

            return configuredLinks.map((link) => {
              const isActive = activeAnchor === link.target_anchor;
              const IconComp =
                link.id === "home" || link.target_anchor === "#top"
                  ? Home
                  : link.id === "products" || link.target_anchor === "#catalogue"
                  ? ShoppingBag
                  : PhoneCall;

              return (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => handleScrollTo(link.target_anchor)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-150 ${
                    isActive
                      ? "bg-[var(--accent)] text-white shadow-xs font-bold"
                      : "text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 opacity-80 hover:opacity-100"
                  }`}
                  title={`Défiler vers ${link.label}`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{link.label}</span>
                </button>
              );
            });
          })()}
        </nav>

        {/* 4. Bouton avec icône triangulaire (Caret ▼/▲) pour basculer les catégories */}
        {categories.length > 0 && config?.categories_toggle?.enabled !== false && (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              aria-expanded={isOpen}
              aria-controls="categories-dropdown"
              className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 text-xs font-bold text-[var(--text)] shadow-2xs hover:border-[var(--accent)] hover:shadow-xs transition-all active:scale-95 cursor-pointer"
              title="Afficher toutes les catégories"
            >
              <Tag className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="hidden xs:inline">
                {config?.categories_toggle?.button_text || "Rayons"}
              </span>
              <span className="rounded-full bg-[var(--accent)] text-white px-1.5 py-0.2 text-[10px] font-mono leading-tight">
                {categories.length}
              </span>

              {/* Icône triangulaire interactive qui pivote à 180° au toggle */}
              <ChevronDown
                className={`w-3.5 h-3.5 text-[var(--accent)] transition-transform duration-200 ease-out ${
                  isOpen ? "rotate-180" : "rotate-0"
                }`}
              />
            </button>

            {/* Menu dépliant des catégories */}
            {isOpen && (
              <div
                id="categories-dropdown"
                className="absolute right-0 top-full mt-2 z-50 w-72 sm:w-80 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                  boxShadow: "0 16px 36px -8px rgba(0,0,0,0.25)",
                }}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)]">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    Filtrer par catégorie
                  </p>
                  <span className="text-[10px] text-[var(--muted)]">
                    {categories.length} disponible{categories.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
                  <Link
                    href={`/${slug}`}
                    onClick={() => setIsOpen(false)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      !activeCategory
                        ? "bg-[var(--accent)] text-white shadow-2xs"
                        : "bg-[var(--bg)] text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 border border-[var(--border)]"
                    }`}
                  >
                    Tous les articles
                  </Link>
                  {categories.map((cat) => {
                    const isSelected = activeCategory === cat;
                    return (
                      <Link
                        key={cat}
                        href={`/${slug}?category=${encodeURIComponent(cat)}`}
                        onClick={() => setIsOpen(false)}
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                          isSelected
                            ? "bg-[var(--accent)] text-white shadow-2xs"
                            : "bg-[var(--bg)] text-[var(--text)] hover:bg-black/5 dark:hover:bg-white/10 border border-[var(--border)]"
                        }`}
                      >
                        {cat}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
