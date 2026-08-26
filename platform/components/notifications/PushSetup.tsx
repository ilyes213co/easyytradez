"use client";

import { useState, useEffect, useCallback } from "react";
import {
  registerServiceWorker,
  subscribeToPush,
  unsubscribeFromPush,
  getPushPermission,
} from "@/lib/webpush";
import { useAuth } from "@/components/auth/AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────────────

type PushState = "unsupported" | "loading" | "denied" | "subscribed" | "unsubscribed";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PushSetup({ storeId }: { storeId: string }) {
  const { user }  = useAuth();
  const supabase  = getSupabaseBrowserClient();
  const [state, setState]     = useState<PushState>("loading");
  const [error, setError]     = useState<string | null>(null);

  // ── Detect current state ─────────────────────────────────────────────────
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    const perm = getPushPermission();
    if (perm === "denied") { setState("denied"); return; }

    // Check if already subscribed
    navigator.serviceWorker.getRegistration("/sw.js").then(async (reg) => {
      if (!reg) { setState("unsubscribed"); return; }
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "unsubscribed");
    });
  }, []);

  // ── Subscribe ────────────────────────────────────────────────────────────
  const handleSubscribe = useCallback(async () => {
    if (!user) return;
    setState("loading");
    setError(null);

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      setState("denied");
      return;
    }

    const reg = await registerServiceWorker();
    if (!reg) { setError("Service worker introuvable."); setState("unsubscribed"); return; }

    const sub = await subscribeToPush(reg);
    if (!sub) { setError("Impossible de s'abonner."); setState("unsubscribed"); return; }

    // Save to backend
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), store_id: storeId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Erreur serveur.");
      setState("unsubscribed");
      return;
    }

    setState("subscribed");
  }, [user, storeId]);

  // ── Unsubscribe ──────────────────────────────────────────────────────────
  const handleUnsubscribe = useCallback(async () => {
    setState("loading");
    setError(null);

    // Get endpoint before unsubscribing
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    const endpoint = sub?.endpoint;

    const ok = await unsubscribeFromPush();
    if (!ok) { setError("Impossible de se désabonner."); setState("subscribed"); return; }

    // Remove from backend
    if (endpoint) {
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint }),
      });
    }

    setState("unsubscribed");
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────

  if (state === "unsupported") {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3">
        <span className="text-lg">🔔</span>
        <div>
          <p className="text-sm font-medium text-white/50">Notifications non supportées</p>
          <p className="text-xs text-white/25 mt-0.5">Votre navigateur ne supporte pas les notifications push.</p>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
        <span className="text-lg mt-0.5">🔕</span>
        <div>
          <p className="text-sm font-medium text-amber-300">Notifications bloquées</p>
          <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
            Vous avez bloqué les notifications pour ce site. Pour les réactiver, cliquez sur l&apos;icône 🔒 dans la barre d&apos;adresse de votre navigateur.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3.5 transition-all ${
      state === "subscribed"
        ? "border-indigo-500/25 bg-indigo-500/[0.07]"
        : "border-white/[0.07] bg-white/[0.025]"
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
          state === "subscribed" ? "bg-indigo-500/20" : "bg-white/[0.05]"
        }`}>
          {state === "subscribed" ? "🔔" : "🔕"}
        </div>
        <div>
          <p className={`text-sm font-semibold ${state === "subscribed" ? "text-indigo-300" : "text-white/70"}`}>
            {state === "subscribed" ? "Notifications activées" : "Notifications désactivées"}
          </p>
          <p className="text-xs text-white/30 mt-0.5">
            {state === "subscribed"
              ? "Vous serez alerté des nouvelles commandes et ruptures de stock."
              : "Activez pour recevoir des alertes en temps réel."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {error && <p className="text-xs text-red-400 max-w-[140px] text-right">{error}</p>}
        {state === "loading" ? (
          <div className="text-white/40"><Spinner /></div>
        ) : state === "subscribed" ? (
          <button
            onClick={handleUnsubscribe}
            className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
          >
            Désactiver
          </button>
        ) : (
          <button
            onClick={handleSubscribe}
            className="rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white transition-all"
            style={{ boxShadow: "0 0 12px rgba(99,102,241,0.25)" }}
          >
            Activer
          </button>
        )}
      </div>
    </div>
  );
}
