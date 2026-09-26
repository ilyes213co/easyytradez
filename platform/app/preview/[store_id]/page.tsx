import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  price: number;
  original_price?: number;
  images: any[];
  category?: string;
  is_featured?: boolean;
  stock_quantity?: number;
}

interface Store {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  primary_color: string;
  whatsapp_phone?: string;
  theme: string;
  animation_style: string;
}

interface PageProps {
  params: { store_id: string };
  searchParams: {
    color?: string;
    theme?: string;
    animation?: string;
    effects?: string;
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = getSupabase();
  const { data: store } = await supabase
    .from("stores")
    .select("name")
    .eq("id", params.store_id)
    .single();
  return { title: store ? `Aperçu — ${store.name}` : "Aperçu boutique" };
}

// ─── Supabase server client ───────────────────────────────────────────────────

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// ─── Theme configs ────────────────────────────────────────────────────────────

const THEMES: Record<string, { bg: string; text: string; card: string; heroGrad: string }> = {
  modern:      { bg: "#f9fafb", text: "#111827", card: "#ffffff", heroGrad: "135deg, #6366f1 0%, #8b5cf6 100%" },
  luxe:        { bg: "#0f0f0f", text: "#f5f0e8", card: "#1a1a1a", heroGrad: "135deg, #1a1a1a 0%, #2d2400 100%" },
  minimaliste: { bg: "#ffffff", text: "#374151", card: "#fafafa", heroGrad: "135deg, #f3f4f6 0%, #e5e7eb 100%" },
  colore:      { bg: "#fdf4ff", text: "#1e1b4b", card: "#ffffff", heroGrad: "135deg, #f43f5e 0%, #f97316 50%, #facc15 100%" },
  tech:        { bg: "#0a0f1e", text: "#e0f2fe", card: "#0f172a", heroGrad: "135deg, #0f172a 0%, #1e3a5f 100%" },
  nature:      { bg: "#f6f5f0", text: "#1c2910", card: "#ffffff", heroGrad: "135deg, #166534 0%, #4d7c0f 100%" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PreviewPage({ params, searchParams }: PageProps) {
  const supabase = getSupabase();

  // ── Load store ───────────────────────────────────────────────────────────────
  const { data: store } = await supabase
    .from("stores")
    .select("id,name,description,logo_url,primary_color,whatsapp_phone,theme,animation_style")
    .eq("id", params.store_id)
    .single();

  if (!store) notFound();

  // ── Apply query-string overrides (live preview from wizard) ─────────────────
  const activeColor   = searchParams.color     || store.primary_color || "#6366f1";
  const activeTheme   = searchParams.theme     || store.theme         || "modern";
  const activeAnim    = searchParams.animation || store.animation_style || "fade";
  const activeEffects = (searchParams.effects  || "").split(",").filter(Boolean);

  // ── Load products (max 6 for preview) ───────────────────────────────────────
  const { data: products } = await supabase
    .from("products")
    .select("id,name,price,original_price,images,category,is_featured,stock_quantity")
    .eq("store_id", params.store_id)
    .limit(6)
    .order("position");

  const defaultThemeStyle = THEMES.modern ?? { bg: "#f9fafb", text: "#111827", card: "#ffffff", heroGrad: "135deg, #6366f1 0%, #8b5cf6 100%" };
  const themeStyle = THEMES[activeTheme] ?? defaultThemeStyle;

  // ── Inline preview HTML (no React, pure SSR string) ─────────────────────────
  const html = buildPreviewHtml(
    store as Store,
    products as Product[] ?? [],
    activeColor,
    themeStyle,
    activeAnim,
    activeEffects
  );

  // NOTE: We MUST NOT return <html> or <body> here. The Next.js App
  // Router wraps every page in `app/layout.tsx`, which already provides
  // <html> and <body>. Rendering them again causes the "html cannot be
  // a child of body" hydration crash. The root layout's viewport meta
  // is sufficient; page-specific styles go in a <style> tag inside the
  // rendered <div> below.
  return (
    <div className="preview-root">
      <style>{`
        .preview-root *, .preview-root *::before, .preview-root *::after {
          box-sizing: border-box; margin: 0; padding: 0;
        }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
        @keyframes slideIn { from { opacity:0; transform:translateX(-16px); } to { opacity:1; transform:none; } }
        @keyframes zoomIn  { from { opacity:0; transform:scale(0.94); } to { opacity:1; transform:scale(1); } }
      `}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildPreviewHtml(
  store: Store,
  products: Product[],
  color: string,
  theme: { bg: string; text: string; card: string; heroGrad: string },
  anim: string,
  effects: string[]
): string {
  const animClass = anim === "douce" ? "anim-fade" : anim === "dynamique" ? "anim-slide" : anim === "spectaculaire" ? "anim-zoom" : "";

  const discount = (p: Product) =>
    p.original_price && p.original_price > p.price
      ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
      : 0;

  const formatPrice = (v: number) =>
    new Intl.NumberFormat("fr-DZ", { minimumFractionDigits: 0 }).format(v) + " DA";

  // Promo banner effect
  const promoBanner = effects.includes("banniere_promo")
    ? `<div style="background:${color};color:#fff;text-align:center;font-size:13px;padding:8px;font-weight:500;overflow:hidden;">
        <span style="display:inline-block;animation:scroll 12s linear infinite;">🎉 Livraison gratuite dès 3000 DA &nbsp;·&nbsp; -10% sur votre première commande &nbsp;·&nbsp; Paiement à la livraison &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
       </div>
       <style>@keyframes scroll{from{transform:translateX(100%)}to{transform:translateX(-100%)}}</style>`
    : "";

  // Countdown effect
  const countdown = effects.includes("compteur_reduction")
    ? `<div id="cntd" style="display:flex;gap:12px;justify-content:center;margin-top:16px;">
        ${["02","14","37"].map((v,i) => `<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 14px;text-align:center;">
          <div style="font-size:20px;font-weight:700;color:#fff;" id="cd${i}">${v}</div>
          <div style="font-size:10px;color:rgba(255,255,255,.6);">${["H","MIN","SEC"][i]}</div>
        </div>`).join("")}
      </div>`
    : "";

  // Product cards
  const productCards = products.map((p, idx) => {
    const disc = discount(p);
    const firstImg = Array.isArray(p.images) && p.images[0]
      ? (typeof p.images[0] === "string" ? p.images[0] : (p.images[0] as any)?.url || "")
      : "";
    const img = firstImg
      ? `<img src="${firstImg}" alt="${p.name}" style="width:100%;height:140px;object-fit:cover;" loading="lazy" />`
      : `<div style="width:100%;height:140px;background:linear-gradient(135deg,${color}33,${color}11);display:flex;align-items:center;justify-content:center;font-size:32px;">🛍️</div>`;

    const stockBadge = effects.includes("compteur_stock") && p.stock_quantity !== undefined && p.stock_quantity < 5
      ? `<span style="background:#fef2f2;color:#dc2626;font-size:10px;padding:2px 6px;border-radius:4px;font-weight:600;">Plus que ${p.stock_quantity} !</span>`
      : "";
    const newBadge = effects.includes("badge_nouveau") && idx < 2
      ? `<span style="background:${color};color:#fff;font-size:10px;padding:2px 7px;border-radius:4px;font-weight:600;">Nouveau</span>`
      : "";

    return `
      <div class="${animClass} anim-delay-${Math.min(idx + 1, 3)}" style="background:${theme.card};border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
        <div style="position:relative;">
          ${img}
          ${disc > 0 ? `<span style="position:absolute;top:8px;left:8px;background:${color};color:#fff;font-size:10px;padding:2px 7px;border-radius:4px;font-weight:700;">-${disc}%</span>` : ""}
        </div>
        <div style="padding:10px;">
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px;">${newBadge}${stockBadge}</div>
          <p style="font-size:13px;font-weight:600;color:${theme.text};margin-bottom:4px;line-height:1.3;">${p.name}</p>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:14px;font-weight:700;color:${color};">${formatPrice(p.price)}</span>
            ${p.original_price ? `<span style="font-size:11px;color:#9ca3af;text-decoration:line-through;">${formatPrice(p.original_price)}</span>` : ""}
          </div>
          <button onclick={"openPreviewOrder(\"" + p.name.replace(/[^a-zA-Z0-9À-ÿ ]/g, " ") + "\", " + p.price + ")"} style="margin-top:8px;width:100%;background:${color};color:#fff;border:none;border-radius:8px;padding:7px;font-size:12px;font-weight:600;cursor:pointer;">Commander</button>
        </div>
      </div>`;
  }).join("");

  // Categories
  const cats = [...new Set(products.map((p) => p.category).filter(Boolean))];
  const catBar = cats.length > 1
    ? `<div style="display:flex;gap:8px;overflow-x:auto;padding:0 16px;margin-bottom:16px;-webkit-overflow-scrolling:touch;">
        <button style="background:${color};color:#fff;border:none;border-radius:20px;padding:6px 14px;font-size:12px;font-weight:600;white-space:nowrap;cursor:pointer;">Tous</button>
        ${cats.map((c) => `<button style="background:transparent;color:${theme.text};border:1px solid #d1d5db;border-radius:20px;padding:6px 14px;font-size:12px;white-space:nowrap;cursor:pointer;">${c}</button>`).join("")}
       </div>`
    : "";

  return `
    <div style="background:${theme.bg};color:${theme.text};min-height:100vh;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">

      ${promoBanner}

      <!-- Navbar -->
      <nav style="position:sticky;top:0;z-index:50;background:${theme.card};border-bottom:1px solid rgba(0,0,0,.06);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;">
          ${store.logo_url ? `<img src="${store.logo_url}" alt="logo" style="width:28px;height:28px;border-radius:6px;object-fit:cover;" />` : `<div style="width:28px;height:28px;border-radius:6px;background:${color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:13px;font-weight:700;">${store.name[0]}</div>`}
          <span style="font-weight:700;font-size:15px;color:${theme.text};">${store.name}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${theme.text}" stroke-width="1.8"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3" stroke-linecap="round"/></svg>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${theme.text}" stroke-width="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </div>
      </nav>

      <!-- Hero -->
      <div class="${animClass}" style="background:linear-gradient(${theme.heroGrad});padding:40px 20px 32px;text-align:center;position:relative;overflow:hidden;">
        <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;background:rgba(255,255,255,.05);border-radius:50%;"></div>
        <p style="font-size:11px;font-weight:600;color:rgba(255,255,255,.7);letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">✨ Boutique officielle</p>
        <h1 style="font-size:22px;font-weight:800;color:#fff;line-height:1.2;margin-bottom:10px;">${store.name}</h1>
        <p style="font-size:13px;color:rgba(255,255,255,.75);max-width:280px;margin:0 auto 18px;">${store.description || "Découvrez nos produits de qualité."}</p>
        ${countdown}
        <a href="#produits" style="display:inline-block;background:#fff;color:${color};border:none;border-radius:24px;padding:10px 24px;font-size:13px;font-weight:700;cursor:pointer;text-decoration:none;">Voir les produits →</a>
      </div>

      <!-- Products -->
      <div id="produits" style="padding:20px 16px;">
        <h2 style="font-size:16px;font-weight:700;margin-bottom:14px;color:${theme.text};">
          ${products.length > 0 ? "Nos produits" : "Aucun produit encore"}
        </h2>
        ${catBar}
        <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;">
          ${products.length > 0 ? productCards : `<div style="grid-column:span 2;text-align:center;padding:40px 0;color:#9ca3af;font-size:13px;">Ajoutez des produits pour les voir apparaître ici.</div>`}
        </div>
      </div>

      <!-- WhatsApp CTA -->
      ${store.whatsapp_phone ? `
      <div style="padding:20px 16px 28px;">
        <a href="https://wa.me/${store.whatsapp_phone.replace(/\D/g, "")}" target="_blank"
           style="display:flex;align-items:center;justify-content:center;gap:10px;background:#25D366;color:#fff;border-radius:14px;padding:14px;font-size:14px;font-weight:700;text-decoration:none;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.532 5.859L.054 23.5l5.763-1.512A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.885 0-3.64-.51-5.148-1.394l-.369-.218-3.82 1.002 1.019-3.735-.242-.387A10 10 0 0 1 2 12c0-5.514 4.486-10 10-10s10 4.486 10 10-4.486 10-10 10z"/></svg>
          Commander via WhatsApp
        </a>
      </div>` : ""}

      <!-- Footer -->
      <footer style="border-top:1px solid rgba(0,0,0,.07);padding:16px;text-align:center;">
        <p style="font-size:11px;color:#9ca3af;">&copy; ${new Date().getFullYear()} ${store.name} · Tous droits réservés</p>
      </footer>
          <!-- Order Modal for Preview -->
      <div id="previewOrderModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9999;align-items:center;justify-content:center;padding:16px;">
        <div style="background:#fff;border-radius:16px;max-width:400px;width:100%;padding:24px;color:#1e293b;box-shadow:0 20px 25px -5px rgba(0,0,0,0.3);position:relative;">
          <button onclick="closePreviewOrder()" style="position:absolute;top:16px;right:16px;border:none;background:none;font-size:20px;cursor:pointer;color:#64748b;">✕</button>
          <h3 style="font-size:18px;font-weight:700;margin-bottom:4px;color:#0f172a;">Commander ce produit</h3>
          <p id="modalProdTitle" style="font-size:13px;color:#64748b;margin-bottom:16px;font-weight:600;"></p>
          <div style="display:flex;flex-direction:column;gap:12px;">
            <div>
              <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:#475569;">Nom et Prénom</label>
              <input id="modalCustName" type="text" placeholder="Ex: Mohamed Benali" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:9px 12px;font-size:13px;outline:none;" />
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:#475569;">Numéro de Téléphone</label>
              <input id="modalCustPhone" type="tel" placeholder="Ex: 0550 12 34 56" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:9px 12px;font-size:13px;outline:none;" />
            </div>
            <div>
              <label style="display:block;font-size:12px;font-weight:600;margin-bottom:4px;color:#475569;">Wilaya de livraison</label>
              <select id="modalCustWilaya" style="width:100%;border:1px solid #cbd5e1;border-radius:8px;padding:9px 12px;font-size:13px;outline:none;background:#fff;">
                <option value="16">16 - Alger</option>
                <option value="31">31 - Oran</option>
                <option value="25">25 - Constantine</option>
                <option value="06">06 - Béjaïa</option>
                <option value="09">09 - Blida</option>
                <option value="15">15 - Tizi Ouzou</option>
                <option value="19">19 - Sétif</option>
                <option value="autre">Autre wilaya</option>
              </select>
            </div>
            <button id="modalSubmitBtn" onclick="submitPreviewOrder()" style="margin-top:6px;width:100%;background:${color};color:#fff;border:none;border-radius:10px;padding:12px;font-size:14px;font-weight:700;cursor:pointer;">
              Valider la commande
            </button>
          </div>
        </div>
      </div>
      <script>
        let currentModalProd = { name: "", price: 0 };
        function openPreviewOrder(name, price) {
          currentModalProd = { name: name, price: price };
          document.getElementById("modalProdTitle").innerText = name + " — " + price + " DA";
          const modal = document.getElementById("previewOrderModal");
          if (modal) modal.style.display = "flex";
        }
        function closePreviewOrder() {
          const modal = document.getElementById("previewOrderModal");
          if (modal) modal.style.display = "none";
        }
        async function submitPreviewOrder() {
          const name = document.getElementById("modalCustName").value.trim();
          const phone = document.getElementById("modalCustPhone").value.trim();
          const wilaya = document.getElementById("modalCustWilaya").value;
          if (!name || !phone) {
            alert("Veuillez remplir votre nom et numéro de téléphone.");
            return;
          }
          const btn = document.getElementById("modalSubmitBtn");
          if (btn) { btn.disabled = true; btn.innerText = "Enregistrement..."; }
          try {
            const res = await fetch("/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                store_id: "${store.id}",
                customer_name: name,
                customer_phone: phone,
                wilaya: wilaya,
                items: [{ name: currentModalProd.name, price: currentModalProd.price, quantity: 1 }],
                total_amount: currentModalProd.price
              })
            });
            if (res.ok) {
              alert("Félicitations " + name + " ! Votre commande a été enregistrée avec succès.");
              closePreviewOrder();
              document.getElementById("modalCustName").value = "";
              document.getElementById("modalCustPhone").value = "";
            } else {
              alert("Erreur lors de la validation. Veuillez réessayer.");
            }
          } catch(e) {
            alert("Erreur réseau. Veuillez vérifier votre connexion.");
          } finally {
            if (btn) { btn.disabled = false; btn.innerText = "Valider la commande"; }
          }
        }
      </script>
    </div>`;
}
