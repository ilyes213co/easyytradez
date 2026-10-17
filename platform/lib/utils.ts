import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9\-]+/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
}

export function formatPrice(amount: number, currency = "DZD"): string {
  return new Intl.NumberFormat("fr-DZ", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a phone number to WhatsApp international standard format (E.164 digits without +).
 * Fixes Algerian numbers (e.g., "0550123456" -> "213550123456") to prevent
 * "nom de profil @05xxxxxxxx n'existe pas" errors on WhatsApp Web/Mobile.
 */
export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\D/g, "");
  if (!cleaned) return "";

  // Strip international exit codes (00)
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }

  // If user entered 0213... instead of +213...
  if (cleaned.startsWith("0213") && cleaned.length >= 12) {
    cleaned = cleaned.slice(1);
  }

  // Algerian format with country code but redundant trunk prefix 0 (e.g. 2130550123456)
  if (cleaned.startsWith("2130") && cleaned.length >= 12) {
    cleaned = `213${cleaned.slice(4)}`;
  }

  // Algerian local format starting with 0 (e.g. 05xx, 06xx, 07xx, 02xx, 03xx, 04xx)
  // 10 digits in Algeria: 05 50 12 34 56 -> 213 550 12 34 56
  if (cleaned.startsWith("0") && cleaned.length >= 9 && cleaned.length <= 11) {
    cleaned = `213${cleaned.slice(1)}`;
  }
  // 9 digits starting with 5, 6, 7 (Algerian mobile without 0 or +213)
  else if (/^[567]\d{8}$/.test(cleaned)) {
    cleaned = `213${cleaned}`;
  }

  // Extra safety: any remaining Algerian mobile starting with 05, 06, 07
  if (/^0[567]\d+$/.test(cleaned)) {
    cleaned = `213${cleaned.slice(1)}`;
  }

  // Clean any leading zeros if somehow left before country code
  cleaned = cleaned.replace(/^0+/, "");

  return cleaned;
}

export function normalizeDzPhone(raw: string): string {
  let digits = String(raw || "").replace(/\D/g, "");
  if (digits.startsWith("00213")) digits = digits.slice(5);
  else if (digits.startsWith("213")) digits = digits.slice(3);
  if (digits.length === 9 && (digits.startsWith("5") || digits.startsWith("6") || digits.startsWith("7"))) {
    digits = "0" + digits;
  }
  return digits;
}

export function isValidStrictDzPhone(cleaned: string): boolean {
  return /^0[567]\d{8}$/.test(cleaned);
}

export function generateWhatsAppUrl(phone: string, message?: string): string {
  const formatted = formatWhatsAppPhone(phone);
  if (!formatted) return "";
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${formatted}${query}`;
}

export function extractWilaya(order: {
  wilaya?: string | null;
  shipping_address?: string | null;
  customer_address?: string | null;
}): string {
  if (order.wilaya && order.wilaya.trim()) return order.wilaya.trim();
  const addr = order.shipping_address || order.customer_address || "";
  if (!addr) return "Algérie";

  const match = addr.match(/Wilaya:\s*([^(—-]+)/i);
  if (match && match[1]) {
    return match[1].trim();
  }
  return "Algérie";
}

export function extractDeliveryMethod(order: {
  shipping_address?: string | null;
  customer_address?: string | null;
  notes?: string | null;
}): {
  mode: "stopdesk" | "domicile";
  label: string;
  type: "office" | "hand-to-hand";
  shortLabel: string;
} {
  const text = `${order.shipping_address || ""} ${order.customer_address || ""} ${order.notes || ""}`.toLowerCase();
  if (
    text.includes("stop desk") ||
    text.includes("stopdesk") ||
    text.includes("bureau") ||
    text.includes("guichet")
  ) {
    return {
      mode: "stopdesk",
      label: "Bureau (Stop Desk)",
      type: "office",
      shortLabel: "Bureau",
    };
  }
  return {
    mode: "domicile",
    label: "À domicile (Main à main)",
    type: "hand-to-hand",
    shortLabel: "À domicile",
  };
}

export function buildStoreUrl(slug: string, domain?: string): string {
  const base = domain ?? process.env.NEXT_PUBLIC_PLATFORM_DOMAIN ?? "localhost:3001";
  return `https://${slug}.${base}`;
}

export function getDiscountPercent(original: number, current: number): number {
  if (!original || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength).trimEnd() + "…";
}

/**
 * Safely extracts a valid image URL from diverse input types:
 * - String URL: "https://..."
 * - Cloudinary or Supabase image object: { url: "https://..." } or { src: "..." }
 * - Filters out corrupted values like "[object Object]".
 */
export function extractImageUrl(val: any): string {
  if (!val) return "";
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (trimmed === "[object Object]" || trimmed === "undefined" || trimmed === "null") return "";
    return trimmed;
  }
  if (typeof val === "object") {
    if (typeof val.url === "string") return extractImageUrl(val.url);
    if (typeof val.src === "string") return extractImageUrl(val.src);
    if (typeof val.image === "string") return extractImageUrl(val.image);
    if (Array.isArray(val) && val.length > 0) return extractImageUrl(val[0]);
  }
  return "";
}

export function safeString(val: any, fallback = ""): string {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") {
    if (val === "[object Object]") return fallback;
    return val;
  }
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  return fallback;
}
