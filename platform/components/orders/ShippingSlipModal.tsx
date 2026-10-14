"use client";

import { useEffect, useRef } from "react";
import type { Order } from "@/lib/supabase";
import { extractWilaya, extractDeliveryMethod } from "@/lib/utils";
import { Printer, X, CheckCircle2, Building2, UserCheck, ShieldCheck } from "lucide-react";

interface OrderItem {
  product_id?: string;
  name: string;
  price: number;
  quantity: number;
  options_selected?: Record<string, string>;
}

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

/**
 * Builds standalone printable HTML for the shipping slip (Bordereau d'expédition).
 * Clean, high-contrast, ink-efficient, perfectly styled for standard A4 or A6/thermal sticker print.
 */
export function generateShippingSlipHtml(order: Order, storeName = "EasyTradez Store"): string {
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
  <title>Bordereau d'expédition #${refCode}</title>
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
    .slip-header .badge {
      background: #ffffff;
      color: #0f172a;
      padding: 3px 10px;
      border-radius: 4px;
      font-weight: 800;
      font-family: monospace;
      font-size: 13px;
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
      display: flex;
      align-items: center;
      gap: 8px;
      text-transform: uppercase;
    }
    .delivery-mode-sub {
      font-size: 11px;
      color: #475569;
      font-weight: 500;
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
      margin-bottom: 6px;
      display: inline-block;
      background: #eff6ff;
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid #bfdbfe;
    }
    .customer-wilaya {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .customer-address {
      font-size: 11px;
      color: #334155;
      line-height: 1.35;
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
      letter-spacing: 0.5px;
      color: #b91c1c;
      margin-bottom: 4px;
    }
    .cod-amount {
      font-size: 22px;
      font-weight: 900;
      color: #0f172a;
      font-family: monospace;
    }
    .cod-currency {
      font-size: 14px;
      color: #475569;
      font-weight: 700;
      margin-left: 4px;
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
      letter-spacing: 0.5px;
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
    .totals-table .grand-total {
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
    .signature-card-title {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: #64748b;
    }
    .signature-line {
      font-size: 9px;
      color: #94a3b8;
      border-top: 1px solid #cbd5e1;
      padding-top: 4px;
    }
    .slip-footer {
      padding: 8px 18px;
      font-size: 9px;
      color: #64748b;
      text-align: center;
      background: #f8fafc;
    }
    .barcode-simulation {
      display: flex;
      align-items: center;
      gap: 2px;
      height: 24px;
      margin-top: 4px;
    }
    .barcode-bar {
      background: #0f172a;
      height: 100%;
    }
    @media print {
      body {
        padding: 0;
      }
      .slip-container {
        border: 2px solid #000;
        border-radius: 0;
      }
    }
  </style>
</head>
<body>
  <div class="slip-container">
    <!-- Header -->
    <div class="slip-header">
      <div>
        <h1>Bordereau d'Expédition / Livraison</h1>
        <div style="font-size: 11px; opacity: 0.9; margin-top: 2px;">
          Boutique : <strong>${escapeHtml(storeName)}</strong> · Plateforme EasyTradez
        </div>
      </div>
      <div style="text-align: right;">
        <div class="badge">#${refCode}</div>
        <div style="font-size: 9px; opacity: 0.8; margin-top: 4px; font-family: monospace;">CODE C.O.D</div>
      </div>
    </div>

    <!-- Meta bar -->
    <div class="meta-bar">
      <div>Date d'émission : <strong>${dateStr}</strong></div>
      <div>Statut : <strong>Validée / Confirmée</strong></div>
      <div>Référence complète : <strong style="font-family: monospace;">${escapeHtml(order.id || "N/A")}</strong></div>
    </div>

    <!-- Mode de livraison (Office or Hand-to-hand) -->
    <div class="delivery-mode-banner">
      <div>
        <div class="delivery-mode-title">
          <span>${isOffice ? "🏢" : "🏠"}</span>
          <span>MODE : ${escapeHtml(delivery.label.toUpperCase())}</span>
        </div>
        <div class="delivery-mode-sub">
          ${
            isOffice
              ? "Livraison en Bureau / Stop Desk — Le colis doit être retiré au guichet du transporteur."
              : "Livraison à domicile — Remise en main propre contre encaissement du montant."
          }
        </div>
      </div>
      <div style="text-align: right;">
        <span style="display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-size: 11px; border: 1.5px solid ${isOffice ? "#b45309" : "#047857"}; background: #fff; color: ${isOffice ? "#b45309" : "#047857"};">
          ${isOffice ? "BUREAU / STOP DESK" : "MAIN À MAIN / DOMICILE"}
        </span>
      </div>
    </div>

    <!-- Info Grid : Client & Montant COD -->
    <div class="info-grid">
      <!-- Destinataire -->
      <div class="info-box">
        <div class="info-box-title">Destinataire (Client)</div>
        <div class="customer-name">${escapeHtml(order.customer_name || "Client")}</div>
        <div>
          <span class="customer-phone">📞 ${escapeHtml(order.customer_phone || "—")}</span>
        </div>
        <div class="customer-wilaya">
          📍 Wilaya : <strong>${escapeHtml(wilaya)}</strong>
        </div>
        <div class="customer-address">
          <strong>Adresse :</strong> ${escapeHtml(order.shipping_address || (order as any).customer_address || "Non spécifiée")}
        </div>
        ${
          order.notes
            ? `<div style="margin-top: 6px; padding: 4px 8px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 4px; font-size: 10px; color: #92400e;">
                <strong>Note :</strong> ${escapeHtml(order.notes)}
              </div>`
            : ""
        }
      </div>

      <!-- Expéditeur & Encaissement C.O.D -->
      <div class="info-box" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="info-box-title">Expéditeur & Envoi</div>
          <div style="font-size: 13px; font-weight: 700; color: #0f172a;">${escapeHtml(storeName)}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Expédition via transporteur express national</div>
        </div>

        <!-- Montant à encaisser -->
        <div class="cod-box">
          <div class="cod-label">⚠️ Montant Total C.O.D à Encaisser</div>
          <div class="cod-amount">
            ${total.toLocaleString("fr-DZ")}<span class="cod-currency">DZD</span>
          </div>
          <div style="font-size: 10px; color: #64748b; margin-top: 3px; font-weight: 600;">
            Paiement Cash à la Réception (C.O.D)
          </div>
        </div>
      </div>
    </div>

    <!-- Articles List Table -->
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

    <!-- Totals Area -->
    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td style="color: #64748b;">Sous-total articles :</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">${subtotal.toLocaleString("fr-DZ")} DZD</td>
        </tr>
        <tr>
          <td style="color: #64748b;">Frais livraison (${isOffice ? "Bureau" : "Domicile"}) :</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">
            ${shippingFee === 0 ? "Gratuite" : `${shippingFee.toLocaleString("fr-DZ")} DZD`}
          </td>
        </tr>
        <tr class="grand-total">
          <td>TOTAL À PERCEVOIR :</td>
          <td style="text-align: right; font-family: monospace; color: #0f172a;">${total.toLocaleString("fr-DZ")} DZD</td>
        </tr>
      </table>
    </div>

    <!-- Émargement / Signatures -->
    <div class="signatures-grid">
      <div class="signature-card">
        <div class="signature-card-title">Visa / Cachet du Transporteur / Livreur</div>
        <div class="signature-line">Date de prise en charge et signature :</div>
      </div>
      <div class="signature-card">
        <div class="signature-card-title">Émargement / Signature du Client Récepteur</div>
        <div class="signature-line">Reçu conforme en espèces · Date et signature :</div>
      </div>
    </div>

    <!-- Footer mentions -->
    <div class="slip-footer">
      Document officiel généré pour le transport et la livraison en Algérie · EasyTradez E-Commerce Platform · ${dateStr}
    </div>
  </div>
</body>
</html>`;
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
 * Avoids popup blockers and prevents dashboard styling bleed.
 */
export function printShippingSlip(order: Order, storeName = "EasyTradez Store") {
  const html = generateShippingSlipHtml(order, storeName);

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

  // Allow styles & DOM to complete render before calling print
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
}

export function ShippingSlipModal({
  isOpen,
  onClose,
  order,
  storeName = "EasyTradez Store",
}: ShippingSlipModalProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen || !order || !iframeRef.current) return;
    const doc = iframeRef.current.contentWindow?.document || iframeRef.current.contentDocument;
    if (doc) {
      doc.open();
      doc.write(generateShippingSlipHtml(order, storeName));
      doc.close();
    }
  }, [isOpen, order, storeName]);

  if (!isOpen || !order) return null;

  const wilaya = extractWilaya(order);
  const delivery = extractDeliveryMethod(order);
  const total = Number(order.total ?? order.total_amount ?? 0);
  const isOffice = delivery.type === "office";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#0f111e] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Bordereau d&apos;expédition</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/70 font-mono">
                  #{order.id.slice(-8).toUpperCase()}
                </span>
              </h2>
              <p className="text-xs text-white/50">
                Commande validée pour {order.customer_name} · {wilaya}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => printShippingSlip(order, storeName)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs sm:text-sm font-bold transition-all shadow-lg shadow-indigo-600/30"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer le bordereau</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 py-3 bg-[#131525] border-b border-white/[0.06] text-xs">
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
              {total.toLocaleString("fr-DZ")} DZD
            </span>
          </div>
        </div>

        {/* Live Printable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#0a0b12] flex items-center justify-center custom-scrollbar">
          <div className="w-full max-w-[760px] bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-300 min-h-[500px]">
            <iframe
              ref={iframeRef}
              title="Aperçu bordereau"
              className="w-full h-[560px] border-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.08] bg-white/[0.02]">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Format conforme pour transporteurs algériens (Yalidine, ZR Express, Procolis, Kazitour, etc.)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
