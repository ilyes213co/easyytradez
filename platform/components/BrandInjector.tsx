"use client";

import { useEffect } from "react";
import type { ThemeId } from "@/types/store";

interface BrandInjectorProps {
  theme: ThemeId;
  brandAccent?: string | null;
  logoUrl?: string | null;
}

/**
 * Injects the brand accent and logo onto <html> via inline styles after the theme sheet,
 * ensuring brand customization takes precedence without altering the rest of the palette.
 */
export default function BrandInjector({
  theme,
  brandAccent,
  logoUrl,
}: BrandInjectorProps) {
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", theme);
    html.style.setProperty("background-color", "var(--bg)");
    html.style.setProperty("color", "var(--text)");
    document.body.style.setProperty("background-color", "var(--bg)");
    document.body.style.setProperty("color", "var(--text)");

    if (brandAccent) {
      html.style.setProperty("--accent", brandAccent);
      html.style.setProperty("--focus", brandAccent);
      html.style.setProperty("--accent-text", brandAccent);
      html.style.setProperty(
        "--accent-soft",
        `color-mix(in srgb, ${brandAccent} 15%, transparent)`
      );
    }

    if (logoUrl) {
      html.style.setProperty("--brand-logo", `url("${logoUrl}")`);
    }

    return () => {
      html.removeAttribute("data-theme");
      html.style.removeProperty("background-color");
      html.style.removeProperty("color");
      document.body.style.removeProperty("background-color");
      document.body.style.removeProperty("color");
      if (brandAccent) {
        html.style.removeProperty("--accent");
        html.style.removeProperty("--focus");
        html.style.removeProperty("--accent-text");
        html.style.removeProperty("--accent-soft");
      }
      if (logoUrl) {
        html.style.removeProperty("--brand-logo");
      }
    };
  }, [theme, brandAccent, logoUrl]);

  return (
    <style
      id="brand-injector-ssr"
      dangerouslySetInnerHTML={{
        __html: `
          html[data-theme="${theme}"],
          html[data-theme="${theme}"] body,
          body:has([data-theme="${theme}"]),
          [data-theme="${theme}"] {
            background-color: var(--bg) !important;
            color: var(--text) !important;
          }
          html[data-theme="${theme}"] {
            ${
              brandAccent
                ? `
              --accent: ${brandAccent} !important;
              --focus: ${brandAccent} !important;
              --accent-text: ${brandAccent} !important;
              --accent-soft: color-mix(in srgb, ${brandAccent} 15%, transparent) !important;
            `
                : ""
            }
            ${logoUrl ? `--brand-logo: url("${logoUrl}") !important;` : ""}
          }
        `,
      }}
    />
  );
}
