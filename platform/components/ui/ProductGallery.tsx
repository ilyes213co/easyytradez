"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductGalleryProps {
  images: string[];
  alt: string;
  /** compact = smaller thumbnails, used in dashboard drawer */
  compact?: boolean;
}

// ─── Zoom hook ────────────────────────────────────────────────────────────────

function useZoom() {
  const [zoomed, setZoomed]     = useState(false);
  const [pos, setPos]           = useState({ x: 50, y: 50 });
  const containerRef            = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width)  * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setPos({ x, y });
  }, []);

  return { zoomed, setZoomed, pos, containerRef, handleMouseMove };
}

// ─── Swipe hook ───────────────────────────────────────────────────────────────

function useSwipe(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const startX = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      startX.current = e.touches[0].clientX;
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current === null || !e.changedTouches[0]) return;
    const diff = startX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      diff > 0 ? onSwipeLeft() : onSwipeRight();
    }
    startX.current = null;
  };

  return { onTouchStart, onTouchEnd };
}

// ─── Arrow button ─────────────────────────────────────────────────────────────

function ArrowBtn({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === "left" ? "Image précédente" : "Image suivante"}
      className={`absolute top-1/2 -translate-y-1/2 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-white/60 shadow-md text-stone-700 hover:bg-white hover:scale-105 active:scale-95 transition-all ${direction === "left" ? "left-3" : "right-3"}`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        {direction === "left"
          ? <polyline points="15 18 9 12 15 6" />
          : <polyline points="9 18 15 12 9 6" />}
      </svg>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ProductGallery({ images, alt, compact = false }: ProductGalleryProps) {
  const [active, setActive]   = useState(0);
  const [animDir, setAnimDir] = useState<"left" | "right" | null>(null);
  const { zoomed, setZoomed, pos, containerRef, handleMouseMove } = useZoom();

  // Reset on images change (e.g. switching products in drawer)
  useEffect(() => { setActive(0); setZoomed(false); }, [images, setZoomed]);

  const go = useCallback((dir: "prev" | "next") => {
    setZoomed(false);
    setAnimDir(dir === "next" ? "left" : "right");
    setActive((i) =>
      dir === "next"
        ? (i + 1) % images.length
        : (i - 1 + images.length) % images.length
    );
    setTimeout(() => setAnimDir(null), 300);
  }, [images.length, setZoomed]);

  const swipe = useSwipe(() => go("next"), () => go("prev"));

  const hasMany = images.length > 1;
  const src     = images[active] ?? null;

  if (!src) {
    return (
      <div className={`${compact ? "h-48" : "aspect-square"} rounded-2xl bg-stone-100 flex items-center justify-center text-6xl text-stone-200`}>
        📦
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-3 ${compact ? "gap-2" : ""}`}>

      {/* ── Main image ──────────────────────────────────────────────── */}
      <div
        ref={containerRef}
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
        {...swipe}
        className={[
          "relative overflow-hidden select-none",
          compact ? "h-52 rounded-xl" : "aspect-square rounded-2xl",
          "bg-stone-100 border border-stone-100",
          zoomed ? "cursor-zoom-out" : hasMany ? "cursor-zoom-in" : "cursor-zoom-in",
        ].join(" ")}
      >
        {/* Image with zoom */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={[
            "w-full h-full object-cover transition-transform duration-100",
            animDir === "left"  ? "-translate-x-3 opacity-80" :
            animDir === "right" ? "translate-x-3 opacity-80"  : "",
          ].join(" ")}
          style={zoomed ? {
            transform: `scale(2.2)`,
            transformOrigin: `${pos.x}% ${pos.y}%`,
            transition: "transform 0.1s ease",
          } : {
            transition: "transform 0.3s ease, opacity 0.2s ease",
          }}
          draggable={false}
        />

        {/* Zoom icon hint */}
        {!zoomed && !compact && (
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-white/80 backdrop-blur-sm border border-white/60 px-2.5 py-1.5 shadow-sm pointer-events-none">
            <svg className="text-stone-500" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <span className="text-[10px] text-stone-500 font-medium">Zoom</span>
          </div>
        )}

        {/* Navigation arrows */}
        {hasMany && !zoomed && (
          <>
            <ArrowBtn direction="left"  onClick={() => go("prev")} />
            <ArrowBtn direction="right" onClick={() => go("next")} />
          </>
        )}

        {/* Dot indicators (mobile) */}
        {hasMany && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 sm:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === active ? "bg-white scale-125" : "bg-white/40"}`}
                aria-label={`Image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {/* Image counter badge */}
        {hasMany && (
          <div className="absolute top-3 right-3 rounded-lg bg-black/40 backdrop-blur-sm px-2 py-0.5 text-xs text-white/80 font-medium">
            {active + 1} / {images.length}
          </div>
        )}
      </div>

      {/* ── Thumbnails ──────────────────────────────────────────────── */}
      {hasMany && (
        <div className={`flex gap-2 overflow-x-auto pb-1 scrollbar-hide`}>
          {images.map((url, i) => (
            <button
              key={url}
              onClick={() => { setActive(i); setZoomed(false); }}
              aria-label={`Voir image ${i + 1}`}
              className={[
                "shrink-0 rounded-xl overflow-hidden border-2 transition-all",
                compact ? "w-14 h-14" : "w-16 h-16",
                i === active
                  ? "border-indigo-500 ring-2 ring-indigo-500/20 scale-105"
                  : "border-stone-200 hover:border-stone-400 opacity-60 hover:opacity-100",
              ].join(" ")}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`${alt} ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
