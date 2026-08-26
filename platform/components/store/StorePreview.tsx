"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StorePreviewProps {
  storeId: string;
  slug?: string;
  primaryColor?: string;
  theme?: string;
  animation?: string;
  effects?: string[];
  /** Called when the iframe finishes loading */
  onLoad?: () => void;
}

type Device = "mobile" | "tablet" | "desktop";

interface DeviceConfig {
  label: string;
  icon: React.ReactNode;
  width: number | "100%";
  height: number;
  showFrame: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEVICES: Record<Device, DeviceConfig> = {
  mobile: {
    label: "Mobile",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <circle cx="12" cy="18.5" r="0.8" fill="currentColor" />
        <line x1="9" y1="4.5" x2="15" y2="4.5" strokeLinecap="round" />
      </svg>
    ),
    width: 375,
    height: 680,
    showFrame: true,
  },
  tablet: {
    label: "Tablette",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <circle cx="12" cy="19" r="0.7" fill="currentColor" />
      </svg>
    ),
    width: 768,
    height: 600,
    showFrame: false,
  },
  desktop: {
    label: "Desktop",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
        <rect x="2" y="3" width="20" height="13" rx="1.5" />
        <path d="M8 20h8M12 16v4" strokeLinecap="round" />
      </svg>
    ),
    width: "100%",
    height: 560,
    showFrame: false,
  },
};

const DEBOUNCE_MS = 800;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildPreviewUrl(
  storeId: string,
  params: Omit<StorePreviewProps, "storeId" | "onLoad">
): string {
  const qs = new URLSearchParams();
  if (params.primaryColor) qs.set("color", params.primaryColor);
  if (params.theme) qs.set("theme", params.theme);
  if (params.animation) qs.set("animation", params.animation);
  if (params.effects?.length) qs.set("effects", params.effects.join(","));
  return `/preview/${storeId}?${qs.toString()}`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function StorePreview({
  storeId,
  slug = "votre-boutique",
  primaryColor,
  theme,
  animation,
  effects,
  onLoad,
}: StorePreviewProps) {
  const [device, setDevice] = useState<Device>("mobile");
  const [isUpdating, setIsUpdating] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Build preview URL (memoised so deps are tracked)
  const previewUrl = useMemo(
    () => buildPreviewUrl(storeId, { slug, primaryColor, theme, animation, effects }),
    [storeId, slug, primaryColor, theme, animation, effects]
  );

  // Debounced reload when params change
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setIsUpdating(true);
    setIframeLoaded(false);

    // Try to post message first (no full reload)
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: "UPDATE_PREVIEW", primaryColor, theme, animation, effects },
        "*"
      );
    } catch {
      /* cross-origin, will fall back to key refresh */
    }

    debounceTimer.current = setTimeout(() => {
      setIframeKey((k) => k + 1);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [previewUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleIframeLoad = useCallback(() => {
    setIsUpdating(false);
    setIframeLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleRefresh = useCallback(() => {
    setIsUpdating(true);
    setIframeLoaded(false);
    setIframeKey((k) => k + 1);
  }, []);

  const handleCopyUrl = useCallback(() => {
    const url = `https://${slug}.platform.dz`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [slug]);

  const handleFullscreen = useCallback(() => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const deviceCfg = DEVICES[device];

  // ── Iframe container style ─────────────────────────────────────────────────
  const iframeContainerStyle: React.CSSProperties =
    device === "desktop"
      ? { width: "100%", height: deviceCfg.height }
      : { width: deviceCfg.width as number, height: deviceCfg.height };

  // ── Phone frame (mobile only) ──────────────────────────────────────────────
  const showPhoneFrame = device === "mobile";

  return (
    <div
      ref={containerRef}
      className="flex flex-col gap-3 bg-white rounded-2xl border border-black/[0.07] overflow-hidden"
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-black/[0.06] bg-white">
        {/* Device switcher */}
        <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-1">
          {(Object.entries(DEVICES) as [Device, DeviceConfig][]).map(
            ([key, cfg]) => (
              <button
                key={key}
                onClick={() => setDevice(key)}
                title={cfg.label}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                  device === key
                    ? "bg-white shadow-sm text-zinc-900"
                    : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {cfg.icon}
                <span className="hidden sm:inline">{cfg.label}</span>
              </button>
            )
          )}
        </div>

        {/* URL bar */}
        <button
          onClick={handleCopyUrl}
          className="flex-1 flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors min-w-0 group"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 shrink-0 text-zinc-300 group-hover:text-zinc-500 transition-colors">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 1 0 20 14.5 14.5 0 0 1 0-20" />
            <path d="M2 12h20" />
          </svg>
          <span className="truncate font-mono">
            {slug}.platform.dz
          </span>
          {copied ? (
            <span className="ml-auto text-emerald-500 font-sans shrink-0">Copié !</span>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-3.5 h-3.5 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
        </button>

        {/* Updating indicator */}
        {isUpdating && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="hidden sm:inline">Mise à jour…</span>
          </div>
        )}

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          title="Actualiser"
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
            <path d="M3 12a9 9 0 0 1 15-6.7L21 8" strokeLinecap="round" />
            <path d="M21 3v5h-5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M21 12a9 9 0 0 1-15 6.7L3 16" strokeLinecap="round" />
            <path d="M3 21v-5h5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Fullscreen */}
        <button
          onClick={handleFullscreen}
          title={isFullscreen ? "Quitter plein écran" : "Plein écran"}
          className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all"
        >
          {isFullscreen ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 0 2-2h3M3 16h3a2 2 0 0 1 2 2v3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4">
              <path d="M3 7V3h4M21 7V3h-4M3 17v4h4M21 17v4h-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* ── Preview area ─────────────────────────────────────────────────────── */}
      <div
        className="flex items-start justify-center overflow-auto px-4 pb-4"
        style={{ minHeight: deviceCfg.height + (showPhoneFrame ? 48 : 24) }}
      >
        {/* Phone frame wrapper */}
        <div
          className={`relative transition-all duration-300 ${showPhoneFrame ? "mt-0" : ""}`}
          style={iframeContainerStyle}
        >
          {/* Phone chrome */}
          {showPhoneFrame && (
            <div
              className="absolute inset-0 z-10 pointer-events-none rounded-[2.8rem] border-[10px] border-zinc-800 shadow-2xl"
              style={{ boxShadow: "0 0 0 1px #27272a inset, 0 30px 80px -20px rgba(0,0,0,0.5)" }}
            >
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[1px] w-24 h-5 bg-zinc-800 rounded-b-2xl z-20" />
              {/* Home bar */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-zinc-600 rounded-full" />
            </div>
          )}

          {/* Skeleton while loading */}
          {!iframeLoaded && (
            <div
              className={`absolute inset-0 z-10 bg-zinc-100 overflow-hidden ${
                showPhoneFrame ? "rounded-[2rem]" : "rounded-xl"
              }`}
            >
              {/* Skeleton UI */}
              <div className="p-4 space-y-4 animate-pulse">
                {/* Hero */}
                <div className="h-40 bg-zinc-200 rounded-xl" />
                {/* Nav */}
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-7 w-16 bg-zinc-200 rounded-full" />
                  ))}
                </div>
                {/* Product grid */}
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-24 bg-zinc-200 rounded-lg" />
                      <div className="h-3 bg-zinc-200 rounded w-3/4" />
                      <div className="h-3 bg-zinc-200 rounded w-1/2" />
                    </div>
                  ))}
                </div>
              </div>
              {/* Loading label */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 text-xs text-zinc-400">
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}

          {/* Actual iframe */}
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={previewUrl}
            title="Aperçu de la boutique"
            onLoad={handleIframeLoad}
            className={`w-full h-full border-0 bg-white transition-opacity duration-300 ${
              showPhoneFrame ? "rounded-[2rem]" : "rounded-xl"
            } ${iframeLoaded ? "opacity-100" : "opacity-0"}`}
            style={{ height: deviceCfg.height }}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      </div>
    </div>
  );
}
