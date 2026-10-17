"use client";

import Script from "next/script";
import { useEffect } from "react";

export interface StoreTrackingPixelsProps {
  facebookPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
}

/**
 * Global helper to fire Purchase conversion across all configured marketing pixels.
 */
export function trackStorePurchase({
  total,
  orderId,
  productName,
  currency = "DZD",
  facebookPixelId,
  tiktokPixelId,
  googleAnalyticsId,
}: {
  total: number;
  orderId?: string;
  productName?: string;
  currency?: string;
  facebookPixelId?: string | null;
  tiktokPixelId?: string | null;
  googleAnalyticsId?: string | null;
}) {
  if (typeof window === "undefined") return;

  const w = window as any;

  // 1. Meta / Facebook Pixel
  if (facebookPixelId && typeof w.fbq === "function") {
    try {
      w.fbq("track", "Purchase", {
        value: total,
        currency,
        content_name: productName || "Produit",
        order_id: orderId,
      });
    } catch (e) {
      console.warn("FB Pixel track Purchase error:", e);
    }
  }

  // 2. TikTok Pixel
  if (tiktokPixelId && typeof w.ttq === "object" && typeof w.ttq.track === "function") {
    try {
      w.ttq.track("CompletePayment", {
        value: total,
        currency,
        content_name: productName || "Produit",
        order_id: orderId,
      });
    } catch (e) {
      console.warn("TikTok Pixel track CompletePayment error:", e);
    }
  }

  // 3. Google Analytics (GA4)
  if (googleAnalyticsId && typeof w.gtag === "function") {
    try {
      w.gtag("event", "purchase", {
        transaction_id: orderId,
        value: total,
        currency,
        items: [
          {
            item_name: productName || "Produit",
            price: total,
          },
        ],
      });
    } catch (e) {
      console.warn("GA track purchase error:", e);
    }
  }
}

/**
 * Injects official Pixel scripts into the storefront head and tracks PageViews.
 */
export default function StoreTrackingPixels({
  facebookPixelId,
  tiktokPixelId,
  googleAnalyticsId,
}: StoreTrackingPixelsProps) {
  const cleanFbId = facebookPixelId?.trim();
  const cleanTiktokId = tiktokPixelId?.trim();
  const cleanGaId = googleAnalyticsId?.trim();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;

    if (cleanFbId && typeof w.fbq === "function") {
      w.fbq("track", "PageView");
    }
    if (cleanTiktokId && typeof w.ttq?.page === "function") {
      w.ttq.page();
    }
    if (cleanGaId && typeof w.gtag === "function") {
      w.gtag("event", "page_view", {
        page_path: window.location.pathname,
      });
    }
  }, [cleanFbId, cleanTiktokId, cleanGaId]);

  return (
    <>
      {/* ─── Facebook / Meta Pixel ────────────────────────────────────────── */}
      {cleanFbId && (
        <>
          <Script id="facebook-pixel" strategy="afterInteractive">
            {`
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${cleanFbId}');
              fbq('track', 'PageView');
            `}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${cleanFbId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {/* ─── TikTok Pixel ─────────────────────────────────────────────────── */}
      {cleanTiktokId && (
        <Script id="tiktok-pixel" strategy="afterInteractive">
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e},ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=document.createElement("script");a.type="text/javascript",a.async=!0,a.src=r+"?sdkid="+e+"&lib="+t;var c=document.getElementsByTagName("script")[0];c.parentNode.insertBefore(a,c)};
              ttq.load('${cleanTiktokId}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {/* ─── Google Analytics (GA4) ───────────────────────────────────────── */}
      {cleanGaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${cleanGaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${cleanGaId}', {
                page_path: window.location.pathname,
              });
            `}
          </Script>
        </>
      )}
    </>
  );
}
