"use client";

import { useEffect, useRef } from "react";

interface StoreAnalyticsTrackerProps {
  storeId: string;
  productId?: string | null;
  isFunnel?: boolean;
}

export default function StoreAnalyticsTracker({
  storeId,
  productId,
  isFunnel = false,
}: StoreAnalyticsTrackerProps) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!storeId || trackedRef.current) return;
    trackedRef.current = true;

    // 1. Detect traffic source
    let source = "Direct";
    try {
      const ref = document.referrer?.toLowerCase() || "";
      if (ref.includes("whatsapp")) source = "WhatsApp";
      else if (ref.includes("facebook") || ref.includes("fb.me")) source = "Facebook";
      else if (ref.includes("instagram")) source = "Instagram";
      else if (ref.includes("tiktok")) source = "TikTok";
      else if (ref.includes("google")) source = "Google";
      else if (ref && !ref.includes(window.location.hostname)) source = "Autre";

      const params = new URLSearchParams(window.location.search);
      const utm = params.get("utm_source") || params.get("source") || params.get("ref");
      if (utm) {
        const u = utm.toLowerCase();
        if (u.includes("wa") || u.includes("whatsapp")) source = "WhatsApp";
        else if (u.includes("fb") || u.includes("facebook")) source = "Facebook";
        else if (u.includes("insta")) source = "Instagram";
        else if (u.includes("tiktok")) source = "TikTok";
        else if (u.includes("google")) source = "Google";
        else source = utm;
      }
    } catch {}

    // Helper to send tracking data
    const sendEvent = (eventType: "view" | "product_view" | "whatsapp_click", extra?: Record<string, any>) => {
      const payload = JSON.stringify({
        store_id: storeId,
        event_type: eventType,
        product_id: productId || null,
        source,
        metadata: {
          path: window.location.pathname,
          is_funnel: isFunnel,
          ...(extra || {}),
        },
      });

      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        try {
          const blob = new Blob([payload], { type: "application/json" });
          const sent = navigator.sendBeacon("/api/analytics/track", blob);
          if (sent) return;
        } catch {}
      }

      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    };

    // 2. Track Page View (+1 vue dans le graphe & compteur)
    sendEvent("view");

    // 3. Track Product View if on product or single-product funnel
    if (productId) {
      sendEvent("product_view");
    }

    // 4. Attach click listener for WhatsApp buttons to track 'whatsapp_click'
    const handleWhatsAppClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest("a");
      if (target && target.href) {
        const href = target.href.toLowerCase();
        if (href.includes("wa.me") || href.includes("whatsapp.com") || href.includes("api.whatsapp")) {
          sendEvent("whatsapp_click");
        }
      }
    };

    document.addEventListener("click", handleWhatsAppClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleWhatsAppClick, { capture: true });
    };
  }, [storeId, productId, isFunnel]);

  return null;
}
