"use client";

import React, {
  useRef,
  useCallback,
  useSyncExternalStore,
  createContext,
  useContext,
  useState,
  useMemo,
} from "react";
import { cn } from "@/lib/utils";

// ─── Formatage Monétaire DA ───────────────────────────────────────────────────
export function formatMoneyDA(amount: number | string): string {
  const n =
    typeof amount === "string"
      ? parseInt(amount.replace(/[^0-9]/g, ""), 10) || 0
      : Math.round(Number(amount) || 0);
  return new Intl.NumberFormat("fr-DZ").format(n) + " DA";
}

// Hook isomorphique pour Next.js (useLayoutEffect côté client, useEffect côté SSR)
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

// ─── Store Isolé par Champ (Pattern Sélecteur) ───────────────────────────────
export class OverridesStoreManager {
  private data: Record<string, any>;
  private listeners = new Map<string, Set<() => void>>();

  constructor(initialData: Record<string, any> = {}) {
    this.data = { ...initialData };
  }

  get(field: string, fallback: any) {
    return this.data[field] !== undefined ? this.data[field] : fallback;
  }

  getAll() {
    return this.data;
  }

  subscribe(field: string, callback: () => void) {
    if (!this.listeners.has(field)) {
      this.listeners.set(field, new Set());
    }
    this.listeners.get(field)!.add(callback);
    return () => {
      this.listeners.get(field)?.delete(callback);
    };
  }

  set(field: string, val: any) {
    if (val === null) {
      delete this.data[field];
    } else {
      this.data[field] = val;
    }
    // Notifie UNIQUEMENT les composants abonnés à ce champ précis
    this.listeners.get(field)?.forEach((cb) => cb());
  }
}

// ─── Contexte React ──────────────────────────────────────────────────────────
interface EditableContextType {
  storeId: string;
  storeManager: OverridesStoreManager;
  queuePatch: (field: string, value: any) => void;
  isEditable: boolean;
  isSaving: boolean;
}

export const EditableStoreContext = createContext<EditableContextType | null>(null);

export function useEditableContext() {
  return useContext(EditableStoreContext);
}

// ─── Provider avec Debounce 600ms & Batching ──────────────────────────────────
export interface EditableProviderProps {
  storeId: string;
  initialOverrides?: Record<string, any>;
  isEditable?: boolean;
  children: React.ReactNode;
}

export function EditableProvider({
  storeId,
  initialOverrides = {},
  isEditable = true,
  children,
}: EditableProviderProps) {
  const storeManager = useMemo(
    () => new OverridesStoreManager(initialOverrides),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [storeId]
  );

  const [isSaving, setIsSaving] = useState(false);
  const pendingPatchesRef = useRef<Record<string, any>>({});
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushQueue = useCallback(async () => {
    const patches = { ...pendingPatchesRef.current };
    if (Object.keys(patches).length === 0) return;

    pendingPatchesRef.current = {};
    setIsSaving(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
      const res = await fetch(`${apiUrl}/api/stores/${storeId}/content`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content_overrides: patches }),
      });
      if (!res.ok) {
        console.warn("Échec PATCH /api/stores/[id]/content, status:", res.status);
      }
    } catch (err) {
      console.error("Erreur de sauvegarde content_overrides:", err);
    } finally {
      setIsSaving(false);
    }
  }, [storeId]);

  const queuePatch = useCallback(
    (field: string, value: any) => {
      pendingPatchesRef.current[field] = value;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        flushQueue();
      }, 600);
    },
    [flushQueue]
  );

  return (
    <EditableStoreContext.Provider
      value={{
        storeId,
        storeManager,
        queuePatch,
        isEditable,
        isSaving,
      }}
    >
      {children}
      {isEditable && (
        <aside
          aria-label="Statut du mode édition"
          className="fixed bottom-4 left-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 text-white text-xs font-medium shadow-lg backdrop-blur border border-slate-700 pointer-events-none select-none"
        >
          <span
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              isSaving ? "bg-amber-400 animate-pulse scale-125" : "bg-emerald-400"
            )}
          />
          <span>{isSaving ? "Enregistrement..." : "Édition en direct active"}</span>
        </aside>
      )}
    </EditableStoreContext.Provider>
  );
}

// ─── Composant <Editable> Isolé ──────────────────────────────────────────────
export interface EditableProps {
  field: string;
  defaultValue: string | number;
  type?: "text" | "price";
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
}

export function Editable({
  field,
  defaultValue,
  type = "text",
  as: Component = "span",
  className,
  style,
}: EditableProps) {
  const ctx = useEditableContext();
  const isEditable = ctx?.isEditable ?? false;
  const storeManager = ctx?.storeManager;
  const queuePatch = ctx?.queuePatch;

  const ref = useRef<HTMLElement>(null);
  const isFocusedRef = useRef(false);

  // Valeur par défaut
  const defaultVal = defaultValue;

  // Abonnement exclusif via useSyncExternalStore si dans un provider
  const value = useSyncExternalStore(
    useCallback(
      (notify) => {
        if (!storeManager) return () => {};
        return storeManager.subscribe(field, notify);
      },
      [storeManager, field]
    ),
    () => {
      if (!storeManager) return defaultVal;
      return storeManager.get(field, defaultVal);
    },
    () => {
      if (!storeManager) return defaultVal;
      return storeManager.get(field, defaultVal);
    }
  );

  const formatDisplay = useCallback(
    (v: string | number) => {
      return type === "price" ? formatMoneyDA(v) : String(v ?? "");
    },
    [type]
  );

  // Injection synchrone sans flash (useIsomorphicLayoutEffect)
  useIsomorphicLayoutEffect(() => {
    if (ref.current && !isFocusedRef.current) {
      ref.current.textContent = formatDisplay(value);
    }
  }, [value, formatDisplay]);

  // Si le mode édition n'est pas activé (visiteurs, SEO, SSR public),
  // on retourne directement l'élément avec son texte statique standard
  if (!isEditable) {
    return (
      <Component className={className} style={style}>
        {formatDisplay(value)}
      </Component>
    );
  }

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    if (!ref.current || !storeManager || !queuePatch) return;

    const raw = ref.current.textContent || "";
    const trimmed = raw.trim();

    if (type === "price") {
      const digits = trimmed.replace(/[^0-9]/g, "");
      const numValue = digits ? parseInt(digits, 10) : null;
      const defaultNum =
        typeof defaultVal === "number"
          ? defaultVal
          : parseInt(String(defaultVal).replace(/[^0-9]/g, ""), 10) || 0;

      // Si le champ est vidé ou égal à la valeur par défaut -> on restaure le template
      if (numValue === null || numValue === defaultNum) {
        ref.current.textContent = formatMoneyDA(defaultNum);
        storeManager.set(field, null);
        queuePatch(field, null);
      } else {
        ref.current.textContent = formatMoneyDA(numValue);
        storeManager.set(field, numValue);
        queuePatch(field, numValue);
      }
    } else {
      // Cas texte libre
      if (!trimmed || trimmed === String(defaultVal)) {
        // Champ vidé ou identique au template -> suppression de l'override
        ref.current.textContent = String(defaultVal);
        storeManager.set(field, null);
        queuePatch(field, null);
      } else {
        storeManager.set(field, trimmed);
        queuePatch(field, trimmed);
      }
    }
  };

  const isInline =
    Component === "span" ||
    Component === "strong" ||
    Component === "b" ||
    Component === "s" ||
    Component === "em" ||
    Component === "small";

  return (
    <Component
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={handleFocus}
      onBlur={handleBlur}
      title="Cliquez pour éditer ce texte"
      className={cn(
        "cursor-text outline-none rounded transition-all duration-150 relative",
        isInline ? "inline-block" : "block",
        "hover:ring-2 hover:ring-amber-400/50 hover:bg-amber-500/5",
        "focus:ring-2 focus:ring-[#2540ea] focus:bg-blue-500/5 dark:focus:ring-sky-400",
        className
      )}
      style={style}
    />
  );
}
