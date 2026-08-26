/**
 * StoreGen Analytics Tracker
 * Injecter dans le <body> du template boutique généré
 * Remplacer {{store_id}} et {{api_url}} par les vraies valeurs
 *
 * Usage : appels non-bloquants avec fetch keepalive
 */

(function () {
  "use strict";

  const STORE_ID = "{{store_id}}";
  const API_URL  = "{{api_url}}";
  const ENDPOINT = `${API_URL}/analytics/track`;

  // ── Détection source ───────────────────────────────────────────────────────
  function detectSource() {
    const ref = document.referrer || "";
    if (!ref)                          return "Direct";
    if (ref.includes("facebook.com") ||
        ref.includes("fb.com"))        return "Facebook";
    if (ref.includes("instagram.com")) return "Instagram";
    if (ref.includes("wa.me") ||
        ref.includes("whatsapp"))      return "WhatsApp";
    if (ref.includes("google.com"))    return "Google";
    return "Autre";
  }

  // ── Envoi non-bloquant ─────────────────────────────────────────────────────
  function track(event_type, extra = {}) {
    try {
      const payload = JSON.stringify({
        store_id:   STORE_ID,
        event_type,
        source:     detectSource(),
        metadata: {
          url:       location.pathname,
          referrer:  document.referrer,
          ua:        navigator.userAgent.slice(0, 120),
          ...extra,
        },
      });

      // keepalive = survit à la fermeture de la page
      if (navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" });
        navigator.sendBeacon(ENDPOINT, blob);
      } else {
        fetch(ENDPOINT, {
          method:    "POST",
          headers:   { "Content-Type": "application/json" },
          body:      payload,
          keepalive: true,
        }).catch(() => {});
      }
    } catch (_) {
      // silent — never break the store
    }
  }

  // ── Page view ──────────────────────────────────────────────────────────────
  track("view");

  // ── Clics WhatsApp ─────────────────────────────────────────────────────────
  document.addEventListener("click", function (e) {
    const target = e.target.closest("a[href*='wa.me'], button[data-whatsapp]");
    if (!target) return;

    const productId = target.closest("[data-product-id]")?.dataset?.productId;
    track("whatsapp_click", productId ? { product_id: productId } : {});
  });

  // ── Vues produit (IntersectionObserver) ────────────────────────────────────
  const seen = new Set();

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const pid = entry.target.dataset?.productId;
          if (!pid || seen.has(pid)) return;
          seen.add(pid);
          track("product_view", { product_id: pid });
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.5 }
    );

    // Observer toutes les cards produit
    document.querySelectorAll("[data-product-id]").forEach((el) => {
      observer.observe(el);
    });

    // Ré-observer après chargement dynamique (au cas où)
    const mo = new MutationObserver(() => {
      document.querySelectorAll("[data-product-id]:not([data-tracked])").forEach((el) => {
        el.dataset.tracked = "1";
        observer.observe(el);
      });
    });
    mo.observe(document.body, { childList: true, subtree: true });
  }

  // ── Ouverture modal produit ─────────────────────────────────────────────────
  document.addEventListener("storeProductOpen", function (e) {
    const pid = e.detail?.productId;
    if (pid) track("product_view", { product_id: pid, source: "modal" });
  });

})();
