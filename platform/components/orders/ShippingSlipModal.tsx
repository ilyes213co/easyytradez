"use client";

import { useState, useEffect, useRef } from "react";
import type { Order } from "@/lib/supabase";
import { extractWilaya, extractDeliveryMethod } from "@/lib/utils";
import { Printer, X, Building2, UserCheck, ShieldCheck, Tag, FileText } from "lucide-react";

interface OrderItem {
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  options_selected?: Record<string, string>;
}

export const DZ_WILAYAS_DATA: Record<number, { code: string; name: string; arabic: string }> = {
  1: { code: "01", name: "Adrar", arabic: "أدرار" },
  2: { code: "02", name: "Chlef", arabic: "الشلف" },
  3: { code: "03", name: "Laghouat", arabic: "الأغواط" },
  4: { code: "04", name: "Oum El Bouaghi", arabic: "أم البواقي" },
  5: { code: "05", name: "Batna", arabic: "باتنة" },
  6: { code: "06", name: "Béjaïa", arabic: "بجاية" },
  7: { code: "07", name: "Biskra", arabic: "بسكرة" },
  8: { code: "08", name: "Béchar", arabic: "بشار" },
  9: { code: "09", name: "Blida", arabic: "البليدة" },
  10: { code: "10", name: "Bouira", arabic: "البويرة" },
  11: { code: "11", name: "Tamanrasset", arabic: "تمنراست" },
  12: { code: "12", name: "Tébessa", arabic: "تبسة" },
  13: { code: "13", name: "Tlemcen", arabic: "تلمسان" },
  14: { code: "14", name: "Tiaret", arabic: "تيارت" },
  15: { code: "15", name: "Tizi Ouzou", arabic: "تيزي وزو" },
  16: { code: "16", name: "Alger", arabic: "الجزائر" },
  17: { code: "17", name: "Djelfa", arabic: "الجلفة" },
  18: { code: "18", name: "Jijel", arabic: "جيجل" },
  19: { code: "19", name: "Sétif", arabic: "سطيف" },
  20: { code: "20", name: "Saïda", arabic: "سعيدة" },
  21: { code: "21", name: "Skikda", arabic: "سكيكدة" },
  22: { code: "22", name: "Sidi Bel Abbès", arabic: "سيدي بلعباس" },
  23: { code: "23", name: "Annaba", arabic: "عنابة" },
  24: { code: "24", name: "Guelma", arabic: "قالمة" },
  25: { code: "25", name: "Constantine", arabic: "قسنطينة" },
  26: { code: "26", name: "Médéa", arabic: "المدية" },
  27: { code: "27", name: "Mostaganem", arabic: "مستغانم" },
  28: { code: "28", name: "M'Sila", arabic: "المسيلة" },
  29: { code: "29", name: "Mascara", arabic: "معسكر" },
  30: { code: "30", name: "Ouargla", arabic: "ورقلة" },
  31: { code: "31", name: "Oran", arabic: "وهران" },
  32: { code: "32", name: "El Bayadh", arabic: "البيض" },
  33: { code: "33", name: "Illizi", arabic: "إليزي" },
  34: { code: "34", name: "Bordj Bou Arreridj", arabic: "برج بوعريريج" },
  35: { code: "35", name: "Boumerdès", arabic: "بومرداس" },
  36: { code: "36", name: "El Tarf", arabic: "الطارف" },
  37: { code: "37", name: "Tindouf", arabic: "تندوف" },
  38: { code: "38", name: "Tissemsilt", arabic: "تيسمسيلت" },
  39: { code: "39", name: "El Oued", arabic: "الوادي" },
  40: { code: "40", name: "Khenchela", arabic: "خنشلة" },
  41: { code: "41", name: "Souk Ahras", arabic: "سوق أهراس" },
  42: { code: "42", name: "Tipaza", arabic: "تيبازة" },
  43: { code: "43", name: "Mila", arabic: "ميلة" },
  44: { code: "44", name: "Aïn Defla", arabic: "عين الدفلى" },
  45: { code: "45", name: "Naâma", arabic: "النعامة" },
  46: { code: "46", name: "Aïn Témouchent", arabic: "عين تموشنت" },
  47: { code: "47", name: "Ghardaïa", arabic: "غرداية" },
  48: { code: "48", name: "Relizane", arabic: "غليزان" },
  49: { code: "49", name: "Timimoun", arabic: "تيميمون" },
  50: { code: "50", name: "Bordj Badji Mokhtar", arabic: "برج باجي مختار" },
  51: { code: "51", name: "Ouled Djellal", arabic: "أولاد جلال" },
  52: { code: "52", name: "Béni Abbès", arabic: "بني عباس" },
  53: { code: "53", name: "In Salah", arabic: "عين صالح" },
  54: { code: "54", name: "In Guezzam", arabic: "عين قزام" },
  55: { code: "55", name: "Touggourt", arabic: "تقرت" },
  56: { code: "56", name: "Djanet", arabic: "جانت" },
  57: { code: "57", name: "El M'Ghair", arabic: "المغير" },
  58: { code: "58", name: "El Meniaa", arabic: "المنيعة" },
};

function parseItems(raw: Order["items"]): OrderItem[] {
  try {
    if (Array.isArray(raw)) return raw as OrderItem[];
    if (typeof raw === "string") return JSON.parse(raw);
    return [];
  } catch {
    return [];
  }
}

function formatSlipDate(iso?: string | null): string {
  if (!iso) return new Date().toLocaleDateString("fr-FR");
  const d = new Date(iso);
  if (isNaN(d.getTime())) return new Date().toLocaleDateString("fr-FR");
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function resolveWilayaInfo(order: Order, defaultWilayaId?: number | null) {
  const rawWilaya = extractWilaya(order);
  const matchNum = rawWilaya.match(/(\d{1,2})/);
  let id: number = matchNum && matchNum[1] ? parseInt(matchNum[1], 10) : 16;

  if (!DZ_WILAYAS_DATA[id]) {
    const rawLower = (rawWilaya + " " + (order.shipping_address || "")).toLowerCase();
    for (const [key, w] of Object.entries(DZ_WILAYAS_DATA)) {
      if (rawLower.includes(w.name.toLowerCase()) || rawLower.includes(w.arabic)) {
        id = Number(key);
        break;
      }
    }
  }

  if ((!id || !DZ_WILAYAS_DATA[id]) && defaultWilayaId && DZ_WILAYAS_DATA[defaultWilayaId]) {
    id = defaultWilayaId;
  }
  if (!id || !DZ_WILAYAS_DATA[id]) {
    id = 16; // Alger par défaut
  }

  const w = DZ_WILAYAS_DATA[id] || { code: "16", name: "Alger", arabic: "الجزائر" };
  return {
    id,
    code: w.code,
    name: w.name,
    arabic: w.arabic,
  };
}

/**
 * Pure SVG Code 39 barcode generator (High contrast vector, scans with 100% precision on laser scanners)
 */
export function generateCode39Svg(text: string, height = 46): string {
  const encodings: Record<string, string> = {
    "0": "000110100", "1": "100100001", "2": "001100001", "3": "101100000",
    "4": "000110001", "5": "100110000", "6": "001110000", "7": "000100101",
    "8": "100100100", "9": "001100100", "A": "100001001", "B": "001001001",
    "C": "101001000", "D": "000011001", "E": "100011000", "F": "001011000",
    "G": "000001101", "H": "100001100", "I": "001001100", "J": "000011100",
    "K": "100000011", "L": "001000011", "M": "101000010", "N": "000010011",
    "O": "100010010", "P": "001010010", "Q": "000000111", "R": "100000110",
    "S": "001000110", "T": "000010110", "U": "110000001", "V": "011000001",
    "W": "111000000", "X": "010010001", "Y": "110010000", "Z": "011010000",
    "-": "010000101", ".": "110000100", " ": "011000100", "*": "010010100",
    "$": "010101000", "/": "010100010", "+": "010001010", "%": "000101010",
  };

  const clean = `*${text.toUpperCase().replace(/[^0-9A-Z\-.$/+% ]/g, "-")}*`;
  const narrow = 1.8;
  const wide = 4.4;
  const gap = 1.8;

  let x = 6;
  const bars: string[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean.charAt(i);
    const pattern: string = encodings[char] ?? encodings["-"] ?? "010000101";
    for (let j = 0; j < 9; j++) {
      const isBar = j % 2 === 0;
      const width = pattern.charAt(j) === "1" ? wide : narrow;
      if (isBar) {
        bars.push(`<rect x="${x.toFixed(1)}" y="0" width="${width.toFixed(1)}" height="${height}" fill="#000000" />`);
      }
      x += width;
    }
    x += gap;
  }

  const totalWidth = Math.ceil(x + 6);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} ${height}" style="width: 100%; max-width: 320px; height: ${height}px; display: block; margin: 0 auto;">${bars.join("")}</svg>`;
}

export interface ShippingSlipConfig {
  sender_name?: string | null;
  customer_service_phone?: string | null;
  default_wilaya_id?: number | null;
  footer_note?: string | null;
}

/**
 * Generates the authentic Algerian thermal shipping label (100x150 mm / A6) matching ZR Express & Yalidine style.
 */
export function generateThermalSlipHtml(
  order: Order,
  storeName = "EasyTradez Store",
  storeOrConfig?: any
): string {
  const items = parseItems(order.items);
  const delivery = extractDeliveryMethod(order);
  const total = Number(order.total ?? order.total_amount ?? 0);
  const isOffice = delivery.type === "office";
  const refCode = order.id ? order.id.slice(-8).toUpperCase() : "000000";
  const dateStr = formatSlipDate(order.created_at);

  const slipConfig: ShippingSlipConfig =
    (storeOrConfig && typeof storeOrConfig === "object" && storeOrConfig.settings?.shipping_slip)
      ? storeOrConfig.settings.shipping_slip
      : (storeOrConfig as ShippingSlipConfig) || {};

  const effectiveSenderName =
    slipConfig.sender_name?.trim() ||
    (storeOrConfig && typeof storeOrConfig === "object" && storeOrConfig.name ? storeOrConfig.name : null) ||
    storeName ||
    "EasyTradez Store";

  const effectiveCustomerServicePhone =
    slipConfig.customer_service_phone?.trim() ||
    (storeOrConfig && typeof storeOrConfig === "object" ? storeOrConfig.whatsapp_phone || storeOrConfig.phone : null) ||
    "";

  const destWilaya = resolveWilayaInfo(order, slipConfig.default_wilaya_id);
  const originWilaya = resolveWilayaInfo(
    { ...order, wilaya: String(slipConfig.default_wilaya_id || 16) },
    slipConfig.default_wilaya_id || 16
  );

  const trackingBarcodeStr = `${destWilaya.code}-${refCode}-DZ`;
  const barcodeSvg = generateCode39Svg(trackingBarcodeStr, 48);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`ORDER:${order.id}|TEL:${order.customer_phone}|COD:${total}DZD`)}`;

  const itemsSummary = items.length > 0
    ? items.map((it) => `${it.quantity || 1}x ${it.name}${it.options_selected ? ` (${Object.values(it.options_selected).join(", ")})` : ""}`).join(" · ")
    : `1x Colis #${refCode}`;

  const headerBannerText = isOffice
    ? `/ SD / HUB ${destWilaya.name.toUpperCase()} ${destWilaya.code} مكتب ${destWilaya.arabic}`
    : `/ DOMICILE / ${destWilaya.name.toUpperCase()} ${destWilaya.code} توصيل للمنزل`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Bordereau Colis DZ - ${destWilaya.code} - #${refCode}</title>
  <style>
    @page {
      size: 100mm 150mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #000000;
      background: #ffffff;
      width: 100mm;
      height: 150mm;
      max-width: 100mm;
      max-height: 150mm;
      padding: 3mm;
      margin: 0 auto;
      font-size: 11px;
      line-height: 1.25;
    }
    .label-wrapper {
      width: 94mm;
      height: 144mm;
      border: 2px solid #000000;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      overflow: hidden;
    }
    .header-banner {
      background: #000000;
      color: #ffffff;
      font-size: 11.5px;
      font-weight: 900;
      padding: 5px 6px;
      text-align: center;
      letter-spacing: 0.3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .top-section {
      display: grid;
      grid-template-columns: 36mm 1fr;
      border-bottom: 2px solid #000000;
    }
    .wilaya-box {
      border-right: 2px solid #000000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 6px 2px;
      background: #ffffff;
      text-align: center;
    }
    .wilaya-number {
      font-size: 46px;
      font-weight: 900;
      line-height: 0.95;
      letter-spacing: -1px;
      font-family: "Arial Black", Impact, sans-serif;
    }
    .wilaya-name {
      font-size: 14px;
      font-weight: 900;
      text-transform: uppercase;
      margin-top: 3px;
    }
    .wilaya-arabic {
      font-size: 13px;
      font-weight: 700;
      direction: rtl;
    }
    .top-right {
      padding: 5px 7px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 10px;
    }
    .carrier-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid #000000;
      padding-bottom: 4px;
    }
    .carrier-title {
      font-size: 12px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .qr-container {
      width: 58px;
      height: 58px;
    }
    .meta-details {
      margin-top: 3px;
      font-size: 9.5px;
      line-height: 1.3;
    }
    .barcode-section {
      padding: 5px 6px 4px 6px;
      border-bottom: 2px solid #000000;
      text-align: center;
      background: #ffffff;
    }
    .barcode-text {
      font-family: monospace;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 1.5px;
      margin-top: 2px;
    }
    .cod-amount-box {
      border-bottom: 2px solid #000000;
      background: #ffffff;
      padding: 6px 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .cod-label-group {
      display: flex;
      flex-direction: column;
    }
    .cod-tag {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .cod-sub {
      font-size: 8.5px;
      color: #333333;
    }
    .cod-price {
      font-size: 26px;
      font-weight: 900;
      font-family: "Arial Black", Impact, monospace;
      letter-spacing: -0.5px;
    }
    .client-section {
      padding: 6px 8px;
      border-bottom: 1.5px solid #000000;
      font-size: 10.5px;
      line-height: 1.35;
    }
    .client-name {
      font-size: 13.5px;
      font-weight: 900;
      margin-bottom: 2px;
    }
    .client-phone {
      font-size: 14.5px;
      font-weight: 900;
      font-family: monospace;
      letter-spacing: 0.8px;
      display: inline-block;
      margin-bottom: 2px;
    }
    .client-address {
      font-size: 10px;
      color: #111111;
      font-weight: 600;
    }
    .content-section {
      padding: 5px 8px;
      border-bottom: 1.5px solid #000000;
      font-size: 9.5px;
      background: #fafafa;
    }
    .content-title {
      font-weight: 900;
      text-transform: uppercase;
      font-size: 9px;
      margin-bottom: 1px;
    }
    .content-items {
      font-size: 9.5px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sender-section {
      padding: 4px 8px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      border-bottom: 1px solid #000000;
    }
    .legal-footer {
      padding: 3px 6px;
      font-size: 7.2px;
      line-height: 1.15;
      text-align: justify;
      color: #222222;
      background: #fdfdfd;
    }
  </style>
</head>
<body>
  <div class="label-wrapper">
    <!-- Header Banner : Mode livraison -->
    <div class="header-banner">
      ${escapeHtml(headerBannerText)}
    </div>

    <!-- Top section : Gros numéro Wilaya + QR & Carrier -->
    <div class="top-section">
      <div class="wilaya-box">
        <div class="wilaya-number">${destWilaya.code}</div>
        <div class="wilaya-name">${escapeHtml(destWilaya.name)}</div>
        <div class="wilaya-arabic">${destWilaya.arabic}</div>
      </div>
      <div class="top-right">
        <div class="carrier-row">
          <div>
            <div class="carrier-title">EXPRESS DZ</div>
            <div style="font-size: 8.5px; font-weight: 700;">السريع للطرود</div>
            <div style="font-size: 8px; color: #444; margin-top: 1px;">Colis #${refCode}</div>
          </div>
          <div class="qr-container">
            <img src="${qrUrl}" alt="QR" width="58" height="58" style="display:block;" />
          </div>
        </div>
        <div class="meta-details">
          <div><strong>Hub départ :</strong> TRI ${originWilaya.code} (${escapeHtml(originWilaya.name)})</div>
          <div><strong>Hub arrivée :</strong> TRI ${destWilaya.code} (${escapeHtml(destWilaya.name)})</div>
          <div><strong>Date :</strong> ${dateStr}</div>
        </div>
      </div>
    </div>

    <!-- Barcode Section Code 39 -->
    <div class="barcode-section">
      ${barcodeSvg}
      <div class="barcode-text">${trackingBarcodeStr}</div>
    </div>

    <!-- Montant C.O.D géant -->
    <div class="cod-amount-box">
      <div class="cod-label-group">
        <span class="cod-tag">⚠️ Montant à encaisser</span>
        <span class="cod-sub">Paiement Cash à la livraison (C.O.D)</span>
      </div>
      <div class="cod-price">
        ${total.toLocaleString("fr-DZ")} DA
      </div>
    </div>

    <!-- Client Destinataire -->
    <div class="client-section">
      <div class="client-name">👤 ${escapeHtml(order.customer_name || "Client")}</div>
      <div class="client-phone">📞 ${escapeHtml(order.customer_phone || "—")}</div>
      <div class="client-address">
        📍 <strong>Adresse :</strong> ${escapeHtml(order.shipping_address || (order as any).customer_address || destWilaya.name)}
      </div>
      ${order.notes ? `<div style="font-size: 8.5px; margin-top: 2px; color: #444;"><strong>Note :</strong> ${escapeHtml(order.notes)}</div>` : ""}
    </div>

    <!-- Contenu des articles -->
    <div class="content-section">
      <div class="content-title">📦 Contenu / Description :</div>
      <div class="content-items">${escapeHtml(itemsSummary)}</div>
    </div>

    <!-- Expéditeur Boutique -->
    <div class="sender-section">
      <div><strong>Expéditeur :</strong> ${escapeHtml(effectiveSenderName)}</div>
      ${effectiveCustomerServicePhone ? `<div><strong>Service Client :</strong> ${escapeHtml(effectiveCustomerServicePhone)}</div>` : ""}
    </div>

    <!-- Mention de responsabilité transport DZ -->
    <div class="legal-footer">
      L'expéditeur est seul responsable du contenu du colis. En le confiant au transporteur express, il certifie que ce contenu respecte les conditions d'expédition définies par la législation algérienne et le transporteur.
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generates the full A4 Invoice / Delivery Slip format.
 */
export function generateA4SlipHtml(
  order: Order,
  storeName = "EasyTradez Store",
  storeOrConfig?: any
): string {
  const items = parseItems(order.items);
  const wilaya = extractWilaya(order);
  const delivery = extractDeliveryMethod(order);
  const total = Number(order.total ?? order.total_amount ?? 0);
  const subtotal = items.reduce(
    (sum, it) => sum + Number(it.price || 0) * Number(it.quantity || 1),
    0
  );
  const shippingFee = Math.max(0, total - subtotal);
  const refCode = order.id ? order.id.slice(-8).toUpperCase() : "000000";
  const dateStr = formatSlipDate(order.created_at);
  const isOffice = delivery.type === "office";

  const slipConfig: ShippingSlipConfig =
    (storeOrConfig && typeof storeOrConfig === "object" && storeOrConfig.settings?.shipping_slip)
      ? storeOrConfig.settings.shipping_slip
      : (storeOrConfig as ShippingSlipConfig) || {};

  const effectiveSenderName =
    slipConfig.sender_name?.trim() ||
    (storeOrConfig && typeof storeOrConfig === "object" && storeOrConfig.name ? storeOrConfig.name : null) ||
    storeName ||
    "EasyTradez Store";

  const effectiveCustomerServicePhone =
    slipConfig.customer_service_phone?.trim() ||
    (storeOrConfig && typeof storeOrConfig === "object" ? storeOrConfig.whatsapp_phone || storeOrConfig.phone : null) ||
    null;

  const effectiveFooterNote =
    slipConfig.footer_note?.trim() || "Merci pour votre confiance !";

  const destWilaya = resolveWilayaInfo(order, slipConfig.default_wilaya_id);
  const trackingBarcodeStr = `${destWilaya.code}-${refCode}-DZ`;
  const barcodeSvg = generateCode39Svg(trackingBarcodeStr, 40);

  const itemsHtml = items
    .map(
      (it, idx) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px;">${idx + 1}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; font-weight: 600;">
          ${escapeHtml(it.name || "Article")}
          ${
            it.options_selected && Object.keys(it.options_selected).length > 0
              ? `<div style="font-size: 10px; color: #64748b; font-weight: normal; margin-top: 2px;">
                  ${Object.entries(it.options_selected)
                    .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(String(v))}`)
                    .join(" | ")}
                </div>`
              : ""
          }
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: center; font-weight: 700;">
          ${it.quantity || 1}
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-family: monospace;">
          ${Number(it.price || 0).toLocaleString("fr-DZ")} DZD
        </td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #e2e8f0; font-size: 11px; text-align: right; font-weight: 600; font-family: monospace;">
          ${(Number(it.price || 0) * Number(it.quantity || 1)).toLocaleString("fr-DZ")} DZD
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <title>Bon de Livraison #${refCode}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 12px;
      line-height: 1.4;
      padding: 16px;
    }
    .slip-container {
      max-width: 760px;
      margin: 0 auto;
      border: 2px solid #0f172a;
      border-radius: 8px;
      overflow: hidden;
      background: #ffffff;
    }
    .slip-header {
      background: #0f172a;
      color: #ffffff;
      padding: 14px 18px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .slip-header h1 {
      font-size: 16px;
      letter-spacing: 0.5px;
      font-weight: 800;
      text-transform: uppercase;
    }
    .meta-bar {
      background: #f8fafc;
      border-bottom: 1px solid #cbd5e1;
      padding: 8px 18px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #475569;
    }
    .delivery-mode-banner {
      padding: 12px 18px;
      border-bottom: 2px dashed #94a3b8;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: ${isOffice ? "#fef3c7" : "#ecfdf5"};
    }
    .delivery-mode-title {
      font-size: 14px;
      font-weight: 800;
      color: ${isOffice ? "#92400e" : "#065f46"};
      text-transform: uppercase;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1px solid #cbd5e1;
    }
    .info-box {
      padding: 14px 18px;
    }
    .info-box:first-child {
      border-right: 1px solid #cbd5e1;
    }
    .info-box-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      font-weight: 800;
      color: #64748b;
      margin-bottom: 8px;
    }
    .customer-name {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .customer-phone {
      font-size: 14px;
      font-weight: 800;
      font-family: monospace;
      color: #1e3a8a;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
    }
    .cod-box {
      background: #f8fafc;
      border: 2px solid #0f172a;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      margin-top: 6px;
    }
    .cod-label {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #b91c1c;
      margin-bottom: 4px;
    }
    .cod-amount {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      font-family: monospace;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #f1f5f9;
      padding: 8px;
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #475569;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    .totals-area {
      padding: 12px 18px;
      border-bottom: 1px solid #cbd5e1;
      background: #f8fafc;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 260px;
      font-size: 11px;
    }
    .totals-table td {
      padding: 3px 0;
    }
    .grand-total {
      font-size: 13px;
      font-weight: 800;
      color: #0f172a;
      border-top: 1px solid #94a3b8;
      padding-top: 6px;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 16px 18px;
      gap: 24px;
      border-bottom: 1px solid #cbd5e1;
    }
    .signature-card {
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 10px;
      min-height: 80px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .slip-footer {
      padding: 8px 18px;
      font-size: 9px;
      color: #64748b;
      text-align: center;
      background: #f8fafc;
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <div class="slip-header">
      <div>
        <h1>Bordereau d'Expédition / Bon de Livraison</h1>
        <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">
          Boutique : <strong>${escapeHtml(effectiveSenderName)}</strong> · EasyTradez
        </div>
      </div>
      <div style="text-align: right;">
        <div style="background: #fff; color: #000; padding: 3px 10px; border-radius: 4px; font-weight: 900; font-family: monospace;">#${refCode}</div>
      </div>
    </div>

    <div class="meta-bar">
      <div>Date : <strong>${dateStr}</strong></div>
      <div>Statut : <strong>Confirmée (COD)</strong></div>
      <div>Wilaya Destination : <strong>${destWilaya.code} - ${escapeHtml(destWilaya.name)}</strong></div>
    </div>

    <div class="delivery-mode-banner">
      <div class="delivery-mode-title">
        ${isOffice ? "🏢 BUREAU / STOP DESK" : "🏠 LIVRAISON À DOMICILE"}
      </div>
      <div>
        ${barcodeSvg}
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">Destinataire (Client)</div>
        <div class="customer-name">${escapeHtml(order.customer_name || "Client")}</div>
        <div class="customer-phone">📞 ${escapeHtml(order.customer_phone || "—")}</div>
        <div style="margin-top: 6px; font-size: 11px;">
          <strong>Adresse :</strong> ${escapeHtml(order.shipping_address || (order as any).customer_address || destWilaya.name)}
        </div>
      </div>

      <div class="info-box" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="info-box-title">Expéditeur</div>
          <div style="font-size: 13px; font-weight: 700;">${escapeHtml(effectiveSenderName)}</div>
          ${effectiveCustomerServicePhone ? `<div style="font-size: 11px; color: #1e3a8a; font-family: monospace;">📞 ${escapeHtml(effectiveCustomerServicePhone)}</div>` : ""}
        </div>
        <div class="cod-box">
          <div class="cod-label">Montant C.O.D à Encaisser</div>
          <div class="cod-amount">${total.toLocaleString("fr-DZ")} DZD</div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 30px;">#</th>
          <th>Désignation Article</th>
          <th style="width: 60px; text-align: center;">Qté</th>
          <th style="width: 100px; text-align: right;">Prix unit.</th>
          <th style="width: 110px; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml || `<tr><td colspan="5" style="padding: 12px; text-align: center; color: #94a3b8;">1x Commande #${refCode}</td></tr>`}
      </tbody>
    </table>

    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td style="color: #64748b;">Sous-total :</td>
          <td style="text-align: right; font-family: monospace;">${subtotal.toLocaleString("fr-DZ")} DZD</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Livraison :</td>
          <td style="text-align: right; font-family: monospace;">${shippingFee === 0 ? "Gratuite" : `${shippingFee.toLocaleString("fr-DZ")} DZD`}</td>
        </tr>
        <tr class="grand-total">
          <td>TOTAL À PERCEVOIR :</td>
          <td style="text-align: right; font-family: monospace;">${total.toLocaleString("fr-DZ")} DZD</td>
        </tr>
      </table>
    </div>

    <div class="signatures-grid">
      <div class="signature-card">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Visa Transporteur / Livreur</div>
        <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 4px;">Date et signature :</div>
      </div>
      <div class="signature-card">
        <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b;">Émargement Client Récepteur</div>
        <div style="font-size: 9px; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 4px;">Reçu conforme en espèces :</div>
      </div>
    </div>

    <div class="slip-footer">
      <div style="font-weight: 700; color: #0f172a; margin-bottom: 2px;">${escapeHtml(effectiveFooterNote)}</div>
      <div>Bordereau officiel · Transport et expédition COD Algérie · EasyTradez</div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Universal HTML generator supporting either thermal label (100x150 mm) or full A4.
 */
export function generateShippingSlipHtml(
  order: Order,
  storeName = "EasyTradez Store",
  storeOrConfig?: any,
  format: "thermal" | "a4" = "thermal"
): string {
  if (format === "a4") {
    return generateA4SlipHtml(order, storeName, storeOrConfig);
  }
  return generateThermalSlipHtml(order, storeName, storeOrConfig);
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Triggers native browser printing for the shipping slip via a dedicated hidden iframe.
 */
export function printShippingSlip(
  order: Order,
  storeName = "EasyTradez Store",
  storeOrConfig?: any,
  format: "thermal" | "a4" = "thermal"
) {
  const html = generateShippingSlipHtml(order, storeName, storeOrConfig, format);

  let iframe = document.getElementById("hidden-print-iframe") as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.id = "hidden-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.top = "-9999px";
    iframe.style.left = "-9999px";
    iframe.style.width = "0px";
    iframe.style.height = "0px";
    iframe.style.border = "none";
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (!doc) return;

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe?.contentWindow?.focus();
    iframe?.contentWindow?.print();
  }, 250);
}

// ─── Modal Component for In-Dashboard Preview & Print ─────────────────────────

interface ShippingSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  storeName?: string;
  store?: any;
}

export function ShippingSlipModal({
  isOpen,
  onClose,
  order,
  storeName = "EasyTradez Store",
  store,
}: ShippingSlipModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<"thermal" | "a4">("thermal");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen || !order || !iframeRef.current) return;
    const doc = iframeRef.current.contentWindow?.document || iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(generateShippingSlipHtml(order, storeName, store, selectedFormat));
      doc.close();
    }
  }, [isOpen, order, storeName, store, selectedFormat]);

  if (!isOpen || !order) return null;

  const wilayaInfo = resolveWilayaInfo(order, store?.settings?.shipping_slip?.default_wilaya_id);
  const delivery = extractDeliveryMethod(order);
  const total = Number(order.total ?? order.total_amount ?? 0);
  const isOffice = delivery.type === "office";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0f111e] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Bordereau Colis DZ</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                  {wilayaInfo.code} - {wilayaInfo.name}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                  #{order.id.slice(-8).toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Format conforme transporteurs algériens (ZR Express, Yalidine, Procolis)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Format Selector Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-white/[0.06] border border-white/10 text-xs mr-2">
              <button
                onClick={() => setSelectedFormat("thermal")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  selectedFormat === "thermal"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title="Format étiquette thermique autocollante 100x150 mm (Standard ZR / Yalidine)"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Étiquette 100x150</span>
              </button>
              <button
                onClick={() => setSelectedFormat("a4")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                  selectedFormat === "a4"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-white/60 hover:text-white"
                }`}
                title="Format Facture / Bon de commande A4 complet"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Bon A4</span>
              </button>
            </div>

            <button
              onClick={() => printShippingSlip(order, storeName, store, selectedFormat)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-2.5 bg-[#131525] border-b border-white/[0.06] text-xs">
          <div>
            <span className="text-white/40 block text-[10px] uppercase font-mono">Client</span>
            <span className="font-semibold text-white truncate block">{order.customer_name}</span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px] uppercase font-mono">Téléphone</span>
            <span className="font-semibold text-indigo-300 font-mono block">{order.customer_phone || "—"}</span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px] uppercase font-mono">Mode livraison</span>
            <span className={`font-semibold inline-flex items-center gap-1 ${isOffice ? "text-amber-400" : "text-emerald-400"}`}>
              {isOffice ? <Building2 className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
              {delivery.label}
            </span>
          </div>
          <div>
            <span className="text-white/40 block text-[10px] uppercase font-mono">Montant C.O.D</span>
            <span className="font-extrabold text-emerald-400 font-mono block">
              ${total.toLocaleString("fr-DZ")} DZD
            </span>
          </div>
        </div>

        {/* Live Printable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0b12] flex items-center justify-center custom-scrollbar">
          <div
            className={`bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-300 transition-all ${
              selectedFormat === "thermal" ? "w-[400px] h-[580px]" : "w-full max-w-[760px] h-[600px]"
            }`}
          >
            <iframe
              ref={iframeRef}
              title="Aperçu bordereau"
              className="w-full h-full border-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>
              {selectedFormat === "thermal"
                ? "Format thermique 100x150 mm conforme aux étiquettes autocollantes ZR Express & Yalidine."
                : "Format page A4 avec tableau détaillé des articles et cadre d'émargement client."}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
