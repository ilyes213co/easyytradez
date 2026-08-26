/**
 * cart-whatsapp.js
 * Système complet de panier + commande WhatsApp
 * Injecté dans le template boutique — Vanilla ES6+, zéro dépendance
 */

/* ═══════════════════════════════════════════════════════════════════
   1. CLASSE ShoppingCart
═══════════════════════════════════════════════════════════════════ */
class ShoppingCart {
  constructor(storageKey = 'cart') {
    this.storageKey = storageKey;
    this.items = this._load();
  }

  /* ── Persistence ── */
  _load() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey)) || [];
    } catch {
      return [];
    }
  }

  _save() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.items));
    this._emit();
  }

  _emit() {
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: { items: this.items, total: this.getTotal() } }));
  }

  /* ── API publique ── */
  addItem(product, quantity = 1) {
    const qty = Math.max(1, parseInt(quantity));
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, 99);
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        image: product.image || '',
        quantity: qty,
      });
    }
    this._save();
  }

  removeItem(productId) {
    this.items = this.items.filter(i => i.id !== productId);
    this._save();
  }

  updateQuantity(productId, qty) {
    const item = this.items.find(i => i.id === productId);
    if (!item) return;
    const newQty = Math.max(1, Math.min(99, parseInt(qty)));
    item.quantity = newQty;
    this._save();
  }

  getItems() { return [...this.items]; }

  getTotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  getTotalItems() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  }

  clearCart() {
    this.items = [];
    this._save();
  }
}

/* ═══════════════════════════════════════════════════════════════════
   2. GÉNÉRATEUR MESSAGE WHATSAPP
═══════════════════════════════════════════════════════════════════ */
function buildWhatsAppMessage(storeName, items, total) {
  const lines = items.map(i =>
    `🛍️ ${i.quantity}x ${i.name} — ${formatPrice(i.price * i.quantity)}`
  ).join('\n');

  return (
    `Bonjour ${storeName} ! 👋\n` +
    `Je souhaite commander :\n\n` +
    `${lines}\n\n` +
    `💰 Total : ${formatPrice(total)}\n\n` +
    `Mon nom : [à remplir]\n` +
    `Mon adresse : [à remplir]`
  );
}

function buildWhatsAppURL(phone, message) {
  const clean = phone.replace(/\D/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function formatPrice(amount) {
  return new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 0 }).format(amount) + ' DZD';
}

/* ═══════════════════════════════════════════════════════════════════
   3. TRACKING ANALYTICS
═══════════════════════════════════════════════════════════════════ */
async function trackEvent(eventType, metadata = {}) {
  try {
    const storeId = window.__STORE_ID__;
    const apiUrl  = window.__API_URL__ || '';
    if (!storeId || !apiUrl) return;
    await fetch(`${apiUrl}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: storeId, event_type: eventType, metadata }),
      keepalive: true,
    });
  } catch { /* silently fail */ }
}

/* ═══════════════════════════════════════════════════════════════════
   4. STYLES (injectés dynamiquement)
═══════════════════════════════════════════════════════════════════ */
function injectStyles() {
  if (document.getElementById('cw-styles')) return;
  const style = document.createElement('style');
  style.id = 'cw-styles';
  style.textContent = `
    /* ── Reset & tokens ── */
    :root {
      --cw-primary:    var(--primary-color, #25D366);
      --cw-danger:     #ef4444;
      --cw-bg:         #ffffff;
      --cw-surface:    #f9fafb;
      --cw-border:     #e5e7eb;
      --cw-text:       #111827;
      --cw-muted:      #6b7280;
      --cw-wa:         #25D366;
      --cw-wa-dark:    #128C7E;
      --cw-radius:     14px;
      --cw-shadow:     0 20px 60px rgba(0,0,0,.18);
      --cw-z-drawer:   1000;
      --cw-z-overlay:  999;
      --cw-z-fab:      998;
      --cw-z-badge:    50;
      --cw-z-popup:    1100;
    }

    /* ── Overlay ── */
    #cw-overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.45);
      backdrop-filter: blur(4px);
      z-index: var(--cw-z-overlay);
      opacity: 0; pointer-events: none;
      transition: opacity .3s ease;
    }
    #cw-overlay.open { opacity: 1; pointer-events: auto; }

    /* ── Drawer ── */
    #cw-drawer {
      position: fixed; top: 0; right: 0; bottom: 0;
      width: min(420px, 100vw);
      background: var(--cw-bg);
      z-index: var(--cw-z-drawer);
      transform: translateX(100%);
      transition: transform .35s cubic-bezier(.4,0,.2,1);
      display: flex; flex-direction: column;
      box-shadow: var(--cw-shadow);
    }
    #cw-drawer.open { transform: translateX(0); }

    /* Drawer header */
    .cw-drawer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--cw-border);
      background: var(--cw-bg);
      position: sticky; top: 0; z-index: 1;
    }
    .cw-drawer-title {
      font-size: 1.1rem; font-weight: 700;
      color: var(--cw-text); display: flex; align-items: center; gap: 8px;
    }
    .cw-drawer-title span.count {
      background: var(--cw-primary); color: #fff;
      border-radius: 999px; padding: 2px 9px;
      font-size: .75rem; font-weight: 700;
    }
    .cw-close-btn {
      width: 36px; height: 36px; border-radius: 50%;
      border: none; background: var(--cw-surface);
      cursor: pointer; display: grid; place-items: center;
      color: var(--cw-muted); transition: background .2s, color .2s;
    }
    .cw-close-btn:hover { background: var(--cw-border); color: var(--cw-text); }

    /* Drawer body */
    .cw-drawer-body {
      flex: 1; overflow-y: auto; padding: 16px 24px;
    }
    .cw-drawer-body::-webkit-scrollbar { width: 4px; }
    .cw-drawer-body::-webkit-scrollbar-thumb { background: var(--cw-border); border-radius: 4px; }

    /* Empty state */
    .cw-empty {
      text-align: center; padding: 60px 0; color: var(--cw-muted);
    }
    .cw-empty svg { opacity: .25; margin-bottom: 16px; }
    .cw-empty p { font-size: .95rem; margin: 0; }

    /* Cart item */
    .cw-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 0;
      border-bottom: 1px solid var(--cw-border);
      animation: cwFadeIn .25s ease both;
    }
    @keyframes cwFadeIn {
      from { opacity:0; transform: translateY(6px); }
      to   { opacity:1; transform: translateY(0); }
    }
    .cw-item-img {
      width: 60px; height: 60px; border-radius: 10px;
      object-fit: cover; flex-shrink: 0;
      background: var(--cw-surface); border: 1px solid var(--cw-border);
    }
    .cw-item-info { flex: 1; min-width: 0; }
    .cw-item-name {
      font-size: .9rem; font-weight: 600;
      color: var(--cw-text); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
    }
    .cw-item-price {
      font-size: .85rem; color: var(--cw-primary);
      font-weight: 700; margin-top: 4px;
    }
    .cw-qty {
      display: flex; align-items: center; gap: 6px; margin-top: 8px;
    }
    .cw-qty-btn {
      width: 26px; height: 26px; border-radius: 8px;
      border: 1.5px solid var(--cw-border); background: var(--cw-surface);
      cursor: pointer; font-size: 1rem; line-height: 1;
      display: grid; place-items: center; transition: background .15s;
      color: var(--cw-text);
    }
    .cw-qty-btn:hover { background: var(--cw-border); }
    .cw-qty-val {
      min-width: 28px; text-align: center;
      font-size: .9rem; font-weight: 700; color: var(--cw-text);
    }
    .cw-item-remove {
      width: 30px; height: 30px; border-radius: 8px;
      border: none; background: transparent;
      cursor: pointer; color: var(--cw-muted);
      display: grid; place-items: center;
      transition: background .15s, color .15s; flex-shrink: 0;
    }
    .cw-item-remove:hover { background: #fee2e2; color: var(--cw-danger); }

    /* Drawer footer */
    .cw-drawer-footer {
      padding: 16px 24px 24px;
      border-top: 1px solid var(--cw-border);
      background: var(--cw-bg);
    }
    .cw-total-row {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: 16px;
    }
    .cw-total-label { font-size: .95rem; color: var(--cw-muted); }
    .cw-total-amount { font-size: 1.3rem; font-weight: 800; color: var(--cw-text); }
    .cw-clear-btn {
      width: 100%; padding: 10px;
      border: 1.5px solid var(--cw-border); border-radius: 10px;
      background: transparent; color: var(--cw-muted);
      cursor: pointer; font-size: .85rem;
      transition: border-color .2s, color .2s;
      margin-bottom: 10px;
    }
    .cw-clear-btn:hover { border-color: var(--cw-danger); color: var(--cw-danger); }
    .cw-wa-btn {
      width: 100%; padding: 14px;
      background: var(--cw-wa);
      border: none; border-radius: 12px;
      color: #fff; font-size: 1rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; gap: 10px;
      transition: background .2s, transform .15s, box-shadow .2s;
      box-shadow: 0 4px 20px rgba(37,211,102,.35);
    }
    .cw-wa-btn:hover {
      background: var(--cw-wa-dark);
      transform: translateY(-1px);
      box-shadow: 0 8px 28px rgba(37,211,102,.45);
    }
    .cw-wa-btn:active { transform: translateY(0); }
    .cw-wa-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; }

    /* ── FAB mobile ── */
    #cw-fab {
      position: fixed; bottom: 24px; right: 24px;
      width: 58px; height: 58px; border-radius: 50%;
      background: var(--cw-primary); color: #fff;
      border: none; cursor: pointer;
      box-shadow: 0 6px 24px rgba(0,0,0,.2);
      display: none; place-items: center;
      z-index: var(--cw-z-fab);
      transition: transform .2s, box-shadow .2s;
    }
    @media (max-width: 768px) { #cw-fab { display: grid; } }
    #cw-fab:hover { transform: scale(1.08); box-shadow: 0 10px 32px rgba(0,0,0,.25); }
    #cw-fab .cw-fab-badge {
      position: absolute; top: -4px; right: -4px;
      min-width: 22px; height: 22px; border-radius: 999px;
      background: var(--cw-danger); color: #fff;
      font-size: .72rem; font-weight: 800;
      display: grid; place-items: center; padding: 0 5px;
      border: 2px solid #fff;
      opacity: 0; transform: scale(0);
      transition: opacity .2s, transform .2s;
    }
    #cw-fab .cw-fab-badge.visible { opacity: 1; transform: scale(1); }

    /* ── Navbar badge ── */
    .cw-nav-badge {
      position: absolute; top: -6px; right: -8px;
      min-width: 18px; height: 18px; border-radius: 999px;
      background: var(--cw-danger); color: #fff;
      font-size: .65rem; font-weight: 800;
      display: grid; place-items: center; padding: 0 4px;
      border: 2px solid #fff;
      opacity: 0; transform: scale(0);
      transition: opacity .2s, transform .2s;
      z-index: var(--cw-z-badge);
    }
    .cw-nav-badge.visible { opacity: 1; transform: scale(1); }

    /* ── "Commander maintenant" sur les cartes produits ── */
    .cw-quick-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 9px 16px; border-radius: 10px;
      background: var(--cw-wa); color: #fff;
      border: none; cursor: pointer;
      font-size: .82rem; font-weight: 600;
      transition: background .2s, transform .15s;
      white-space: nowrap;
    }
    .cw-quick-btn:hover { background: var(--cw-wa-dark); transform: translateY(-1px); }

    /* ── Popup de confirmation ── */
    #cw-popup {
      position: fixed; inset: 0;
      display: grid; place-items: center;
      z-index: var(--cw-z-popup);
      opacity: 0; pointer-events: none;
      transition: opacity .25s ease;
    }
    #cw-popup.open { opacity: 1; pointer-events: auto; }
    #cw-popup::before {
      content: ''; position: absolute; inset: 0;
      background: rgba(0,0,0,.5); backdrop-filter: blur(6px);
    }
    .cw-popup-card {
      position: relative;
      background: var(--cw-bg); border-radius: 20px;
      padding: 32px 28px; max-width: 380px; width: calc(100% - 40px);
      box-shadow: var(--cw-shadow);
      transform: scale(.92) translateY(12px);
      transition: transform .3s cubic-bezier(.34,1.56,.64,1);
      text-align: center;
    }
    #cw-popup.open .cw-popup-card { transform: scale(1) translateY(0); }
    .cw-popup-icon {
      width: 64px; height: 64px; border-radius: 50%;
      background: #dcfce7; display: grid; place-items: center;
      margin: 0 auto 20px;
    }
    .cw-popup-title {
      font-size: 1.2rem; font-weight: 800; color: var(--cw-text);
      margin: 0 0 10px;
    }
    .cw-popup-summary {
      font-size: .9rem; color: var(--cw-muted);
      margin: 0 0 24px; line-height: 1.5;
    }
    .cw-popup-actions { display: flex; gap: 10px; }
    .cw-popup-cancel {
      flex: 1; padding: 12px;
      border: 1.5px solid var(--cw-border); border-radius: 10px;
      background: transparent; color: var(--cw-muted);
      cursor: pointer; font-size: .9rem; transition: border-color .2s;
    }
    .cw-popup-cancel:hover { border-color: var(--cw-text); color: var(--cw-text); }
    .cw-popup-confirm {
      flex: 2; padding: 12px;
      background: var(--cw-wa); border: none; border-radius: 10px;
      color: #fff; font-size: .95rem; font-weight: 700;
      cursor: pointer; display: flex; align-items: center;
      justify-content: center; gap: 8px;
      transition: background .2s;
    }
    .cw-popup-confirm:hover { background: var(--cw-wa-dark); }

    /* ── Toast ── */
    #cw-toast {
      position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
      background: #1f2937; color: #fff;
      padding: 10px 20px; border-radius: 999px;
      font-size: .85rem; font-weight: 500;
      z-index: 1200; pointer-events: none;
      opacity: 0; transition: opacity .3s, transform .3s;
      white-space: nowrap;
    }
    #cw-toast.show { opacity: 1; transform: translateX(-50%) translateY(-6px); }
  `;
  document.head.appendChild(style);
}

/* ═══════════════════════════════════════════════════════════════════
   5. CONSTRUCTION DU DOM
═══════════════════════════════════════════════════════════════════ */
function buildDOM() {
  // Overlay
  const overlay = document.createElement('div');
  overlay.id = 'cw-overlay';
  document.body.appendChild(overlay);

  // Toast
  const toast = document.createElement('div');
  toast.id = 'cw-toast';
  document.body.appendChild(toast);

  // Popup confirmation
  document.body.insertAdjacentHTML('beforeend', `
    <div id="cw-popup" role="dialog" aria-modal="true" aria-labelledby="cw-popup-title">
      <div class="cw-popup-card">
        <div class="cw-popup-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="#16a34a">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.122 1.524 5.855L0 24l6.335-1.509A11.936 11.936 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.898 0-3.667-.525-5.181-1.437l-.371-.222-3.762.896.953-3.668-.242-.387A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
          </svg>
        </div>
        <h2 class="cw-popup-title" id="cw-popup-title">Confirmer la commande</h2>
        <p class="cw-popup-summary" id="cw-popup-summary">Vous allez être redirigé vers WhatsApp pour finaliser votre commande.</p>
        <div class="cw-popup-actions">
          <button class="cw-popup-cancel" id="cw-popup-cancel">Annuler</button>
          <button class="cw-popup-confirm" id="cw-popup-confirm">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-1.898 0-3.667-.525-5.181-1.437l-.371-.222-3.762.896.953-3.668-.242-.387A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            Ouvrir WhatsApp
          </button>
        </div>
      </div>
    </div>
  `);

  // Drawer
  document.body.insertAdjacentHTML('beforeend', `
    <aside id="cw-drawer" role="complementary" aria-label="Panier">
      <div class="cw-drawer-header">
        <div class="cw-drawer-title">
          🛒 Mon panier
          <span class="count" id="cw-header-count">0</span>
        </div>
        <button class="cw-close-btn" id="cw-drawer-close" aria-label="Fermer le panier">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div class="cw-drawer-body" id="cw-drawer-body"></div>
      <div class="cw-drawer-footer">
        <div class="cw-total-row">
          <span class="cw-total-label">Total</span>
          <span class="cw-total-amount" id="cw-total">0 DZD</span>
        </div>
        <button class="cw-clear-btn" id="cw-clear-btn">🗑️ Vider le panier</button>
        <button class="cw-wa-btn" id="cw-wa-btn" disabled>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zm-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Commander via WhatsApp ↗
        </button>
      </div>
    </aside>
  `);

  // FAB mobile
  document.body.insertAdjacentHTML('beforeend', `
    <button id="cw-fab" aria-label="Ouvrir le panier">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
        <line x1="3" y1="6" x2="21" y2="6"/>
        <path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      <span class="cw-fab-badge" id="cw-fab-badge">0</span>
    </button>
  `);
}

/* ═══════════════════════════════════════════════════════════════════
   6. RENDU DU PANIER
═══════════════════════════════════════════════════════════════════ */
function renderCart(cart) {
  const body  = document.getElementById('cw-drawer-body');
  const items = cart.getItems();
  const total = cart.getTotal();

  /* Badge count */
  const count = cart.getTotalItems();
  const countEl = document.getElementById('cw-header-count');
  if (countEl) countEl.textContent = count;

  /* FAB badge */
  const fab = document.getElementById('cw-fab-badge');
  if (fab) {
    fab.textContent = count;
    fab.classList.toggle('visible', count > 0);
  }

  /* Navbar badge — cherche le premier élément avec data-cart-badge */
  document.querySelectorAll('[data-cart-badge]').forEach(el => {
    el.textContent = count;
    el.classList.toggle('visible', count > 0);
  });

  /* Total */
  const totalEl = document.getElementById('cw-total');
  if (totalEl) totalEl.textContent = formatPrice(total);

  /* Bouton commander */
  const waBtn = document.getElementById('cw-wa-btn');
  if (waBtn) waBtn.disabled = items.length === 0;

  /* Liste articles */
  if (!body) return;
  if (items.length === 0) {
    body.innerHTML = `
      <div class="cw-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        <p>Votre panier est vide</p>
      </div>`;
    return;
  }

  body.innerHTML = items.map(item => `
    <div class="cw-item" data-id="${item.id}">
      ${item.image
        ? `<img class="cw-item-img" src="${item.image}" alt="${item.name}" loading="lazy">`
        : `<div class="cw-item-img" style="background:#f3f4f6;display:grid;place-items:center;font-size:1.5rem">🛍️</div>`
      }
      <div class="cw-item-info">
        <div class="cw-item-name">${item.name}</div>
        <div class="cw-item-price">${formatPrice(item.price * item.quantity)}</div>
        <div class="cw-qty">
          <button class="cw-qty-btn" data-action="dec" data-id="${item.id}" aria-label="Diminuer">−</button>
          <span class="cw-qty-val">${item.quantity}</span>
          <button class="cw-qty-btn" data-action="inc" data-id="${item.id}" aria-label="Augmenter">+</button>
        </div>
      </div>
      <button class="cw-item-remove" data-id="${item.id}" aria-label="Supprimer ${item.name}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
        </svg>
      </button>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════════════════════════
   7. TOAST HELPER
═══════════════════════════════════════════════════════════════════ */
function showToast(message) {
  const toast = document.getElementById('cw-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

/* ═══════════════════════════════════════════════════════════════════
   8. POPUP WHATSAPP
═══════════════════════════════════════════════════════════════════ */
function openWhatsAppPopup(cart, storeName, whatsappPhone) {
  const items = cart.getItems();
  if (items.length === 0) return;

  const total   = cart.getTotal();
  const popup   = document.getElementById('cw-popup');
  const summary = document.getElementById('cw-popup-summary');
  const confirm = document.getElementById('cw-popup-confirm');
  const cancel  = document.getElementById('cw-popup-cancel');

  const itemsText = items.map(i => `${i.quantity}x ${i.name}`).join(', ');
  summary.textContent = `${itemsText} — Total : ${formatPrice(total)}`;

  popup.classList.add('open');

  const cleanup = () => popup.classList.remove('open');

  const onConfirm = () => {
    cleanup();
    const msg = buildWhatsAppMessage(storeName, items, total);
    const url = buildWhatsAppURL(whatsappPhone, msg);
    trackEvent('whatsapp_click', { total, item_count: items.length });
    window.open(url, '_blank', 'noopener');
  };

  confirm.onclick = onConfirm;
  cancel.onclick  = cleanup;
  popup.onclick   = (e) => { if (e.target === popup) cleanup(); };
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { cleanup(); document.removeEventListener('keydown', esc); }
  });
}

/* ═══════════════════════════════════════════════════════════════════
   9. DRAWER OPEN/CLOSE
═══════════════════════════════════════════════════════════════════ */
function openDrawer() {
  document.getElementById('cw-drawer')?.classList.add('open');
  document.getElementById('cw-overlay')?.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  document.getElementById('cw-drawer')?.classList.remove('open');
  document.getElementById('cw-overlay')?.classList.remove('open');
  document.body.style.overflow = '';
}

/* ═══════════════════════════════════════════════════════════════════
   10. INJECTION BOUTONS SUR CARTES PRODUITS
═══════════════════════════════════════════════════════════════════ */
function injectQuickButtons(cart, storeName, whatsappPhone) {
  document.querySelectorAll('[data-product-id]').forEach(card => {
    if (card.querySelector('.cw-quick-btn')) return; // déjà injecté

    const id    = card.dataset.productId;
    const name  = card.dataset.productName  || card.querySelector('[data-name]')?.textContent  || 'Produit';
    const price = card.dataset.productPrice || card.querySelector('[data-price]')?.textContent || '0';
    const image = card.dataset.productImage || card.querySelector('img')?.src || '';

    const product = { id, name, price: parseFloat(price.replace(/\D/g,'')), image };

    /* Bouton "Ajouter au panier" */
    const addBtn = document.createElement('button');
    addBtn.className = 'cw-quick-btn';
    addBtn.setAttribute('aria-label', `Ajouter ${name} au panier`);
    addBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6z"/>
        <line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
      Ajouter au panier`;
    addBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      cart.addItem(product, 1);
      showToast(`✓ ${name} ajouté au panier`);
    };

    /* Bouton "Commander maintenant" via WhatsApp direct */
    const nowBtn = document.createElement('button');
    nowBtn.className = 'cw-quick-btn';
    nowBtn.style.background = 'var(--cw-wa)';
    nowBtn.setAttribute('aria-label', `Commander ${name} maintenant`);
    nowBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 22c-1.898 0-3.667-.525-5.181-1.437l-.37-.222-3.762.896.952-3.668-.242-.387A9.944 9.944 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
      </svg>
      Commander`;
    nowBtn.onclick = (e) => {
      e.preventDefault(); e.stopPropagation();
      const msg = buildWhatsAppMessage(storeName, [{ ...product, quantity: 1 }], product.price);
      const url = buildWhatsAppURL(whatsappPhone, msg);
      trackEvent('whatsapp_click', { product_id: id, product_name: name, direct: true });
      window.open(url, '_blank', 'noopener');
    };

    /* Zone d'actions sur la carte */
    let actionsZone = card.querySelector('[data-product-actions]');
    if (!actionsZone) {
      actionsZone = document.createElement('div');
      actionsZone.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;';
      card.appendChild(actionsZone);
    }
    actionsZone.appendChild(addBtn);
    actionsZone.appendChild(nowBtn);
  });
}

/* ═══════════════════════════════════════════════════════════════════
   11. INIT PRINCIPAL
═══════════════════════════════════════════════════════════════════ */
function initCartWhatsApp({ storeName, whatsappPhone, storeId, apiUrl } = {}) {
  /* Expose les globals pour le tracking */
  window.__STORE_ID__ = storeId  || document.body.dataset.storeId  || '';
  window.__API_URL__  = apiUrl   || document.body.dataset.apiUrl   || '';

  const _name  = storeName    || document.body.dataset.storeName  || 'la boutique';
  const _phone = whatsappPhone|| document.body.dataset.waPhone    || '';

  injectStyles();
  buildDOM();

  const cart = new ShoppingCart(`cart_${window.__STORE_ID__ || 'default'}`);

  /* Rendu initial */
  renderCart(cart);

  /* Listeners événements panier */
  window.addEventListener('cartUpdated', () => renderCart(cart));

  /* Drawer body — délégation */
  document.getElementById('cw-drawer-body')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) {
      const rem = e.target.closest('.cw-item-remove');
      if (rem) { cart.removeItem(rem.dataset.id); showToast('Article supprimé'); }
      return;
    }
    const id  = btn.dataset.id;
    const item = cart.getItems().find(i => i.id === id);
    if (!item) return;
    if (btn.dataset.action === 'inc') cart.updateQuantity(id, item.quantity + 1);
    if (btn.dataset.action === 'dec') {
      if (item.quantity <= 1) { cart.removeItem(id); showToast('Article supprimé'); }
      else cart.updateQuantity(id, item.quantity - 1);
    }
  });

  /* Bouton Commander WhatsApp dans le drawer */
  document.getElementById('cw-wa-btn')?.addEventListener('click', () => {
    closeDrawer();
    openWhatsAppPopup(cart, _name, _phone);
  });

  /* Vider le panier */
  document.getElementById('cw-clear-btn')?.addEventListener('click', () => {
    cart.clearCart();
    showToast('Panier vidé');
  });

  /* Fermer drawer */
  document.getElementById('cw-drawer-close')?.addEventListener('click', closeDrawer);
  document.getElementById('cw-overlay')?.addEventListener('click', closeDrawer);

  /* FAB mobile */
  document.getElementById('cw-fab')?.addEventListener('click', openDrawer);

  /* Bouton panier dans la navbar (data-open-cart) */
  document.querySelectorAll('[data-open-cart]').forEach(el => {
    el.style.position = 'relative';
    /* Injecter badge si absent */
    if (!el.querySelector('[data-cart-badge]')) {
      const badge = document.createElement('span');
      badge.className = 'cw-nav-badge';
      badge.dataset.cartBadge = '';
      el.appendChild(badge);
    }
    el.addEventListener('click', e => { e.preventDefault(); openDrawer(); });
  });
  renderCart(cart); /* refresh badges */

  /* Keyboard */
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDrawer();
  });

  /* Injection boutons sur cartes produits (initial + observer) */
  injectQuickButtons(cart, _name, _phone);
  const observer = new MutationObserver(() => injectQuickButtons(cart, _name, _phone));
  observer.observe(document.body, { childList: true, subtree: true });

  /* Exposer l'API globale */
  window.CartWA = {
    cart,
    open:  openDrawer,
    close: closeDrawer,
    addItem: (product, qty = 1) => cart.addItem(product, qty),
  };

  return window.CartWA;
}

/* ═══════════════════════════════════════════════════════════════════
   12. AUTO-INIT si data-attributes présents
═══════════════════════════════════════════════════════════════════ */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    if (document.body.dataset.storeName || document.body.dataset.waPhone) {
      initCartWhatsApp();
    }
  });
} else {
  if (document.body.dataset.storeName || document.body.dataset.waPhone) {
    initCartWhatsApp();
  }
}

/* Export */
if (typeof module !== 'undefined') module.exports = { ShoppingCart, initCartWhatsApp, buildWhatsAppURL, buildWhatsAppMessage };
