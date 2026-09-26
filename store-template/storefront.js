/* =============================================================================
 * StoreGen Storefront Runtime — v3 (single consolidated runtime)
 * -----------------------------------------------------------------------------
 * This file is the ONLY runtime for the storefront. The legacy ~590-line inline
 * script block that used to live in template.html has been removed; its UI
 * features (search, mobile menu, counters, particles, reveal animations) were
 * ported here and unified with the refactored cart/modal logic.
 *
 * Bug history this file fixes:
 *   1. "Buy" button dead — legacy code addressed products by ARRAY INDEX
 *      (PRODUCTS[id], PRODUCTS[+id]) while the backend now emits products with
 *      string UUID ids. Every lookup returned undefined and silently returned.
 *      → All lookups now go through byId(), a String(id) comparator.
 *   2. Double runtime — the template used to load this file ON TOP of the
 *      legacy inline script, causing double add-to-cart / double WhatsApp.
 *      → The legacy block was deleted; this file is the single runtime.
 *   3. Missing runtime on production — the deployer did not upload this file
 *      (fixed in api/services/deployer.py) and vercel.json served index.html
 *      for every asset path (routes fixed there too).
 *
 * Design principles: single source of truth for data, delegated events (no
 * inline onclick, CSP-friendly), every external string escaped before HTML
 * interpolation, every DOM lookup null-safe, analytics never breaks the page.
 * =========================================================================== */

(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════════════
     1. DATA — the only source of truth for store + product shape
     ══════════════════════════════════════════════════════════════════════ */

  const STORE    = window.STORE_DATA || {};
  const PRODUCTS = Array.isArray(window.PRODUCTS_DATA) ? window.PRODUCTS_DATA : [];

  const escapeHtml = (s) =>
    String(s ?? '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));

  const formatPrice = (v) => Number(v || 0).toLocaleString('fr-DZ') + ' DA';
  const cleanPhone  = (p) => String(p || '').replace(/\D/g, '');

  const el = (id) => document.getElementById(id);

  /** String-safe product lookup — NEVER index into the array (UUID ids). */
  const byId = (id) => PRODUCTS.find((p) => String(p.id) === String(id));

  /** Missing/NULL stock is treated as in-stock — never block a purchase. */
  const isInStock = (p) => !!p && Number(p.stock_quantity ?? p.stock ?? 1) > 0;

  /** Reduced-motion preference — guarded because matchMedia is experimental
   *  and a throw here would take the whole runtime down. */
  let prefersReducedMotion = false;
  try {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    prefersReducedMotion = false;
  }

  /* ══════════════════════════════════════════════════════════════════════
     2. CART — localStorage persistence + pub/sub
     Shape: { [productId: string]: quantity } (string keys, UUID safe)
     ══════════════════════════════════════════════════════════════════════ */

  const Cart = (() => {
    const KEY = 'cart_' + (STORE.slug || 'default');

    const read = () => {
      try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
      catch { return {}; }
    };
    const write = (state) => {
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* private mode */ }
      document.dispatchEvent(new CustomEvent('cart:changed', { detail: state }));
    };

    const listeners = new Set();
    document.addEventListener('cart:changed', (e) =>
      listeners.forEach((fn) => fn(e.detail)));

    return {
      KEY,
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      get state() { return read(); },
      count(s = read()) {
        return Object.values(s).reduce((n, q) => n + Number(q || 0), 0);
      },
      total(s = read()) {
        return Object.entries(s).reduce((sum, [id, qty]) => {
          const p = byId(id);
          return sum + (p ? Number(p.price) * Number(qty) : 0);
        }, 0);
      },
      /** @returns {boolean} false when the product is missing/out of stock */
      add(id, qty = 1) {
        const p = byId(id);
        if (!p || !isInStock(p)) return false;
        const s = read();
        s[id] = Math.min(99, (Number(s[id]) || 0) + Math.max(1, Number(qty) || 1));
        write(s);
        return true;
      },
      setQty(id, qty) {
        const s = read();
        if (!(id in s)) return;
        const next = Number(qty) || 0;
        if (next <= 0) delete s[id]; else s[id] = Math.min(99, next);
        write(s);
      },
      remove(id) { const s = read(); delete s[id]; write(s); },
      clear() { write({}); },
    };
  })();

  /* ══════════════════════════════════════════════════════════════════════
     3. WHATSAPP — order messages + deep links
     ══════════════════════════════════════════════════════════════════════ */

  const WhatsApp = (() => {
    const phone = cleanPhone(STORE.whatsapp_phone || STORE.phone || '');

    function orderMessage(lines, total) {
      let msg = (
        `🛒 *Commande — ${STORE.name || 'Boutique'}*\n\n` +
        lines.join('\n') +
        `\n\n💰 *Total : ${formatPrice(total)}*`
      );
      const ps = STORE.payment_settings || {};
      if (ps.baridimob_enabled && ps.baridimob_rip) {
        msg += `\n\n💳 *Moyens de paiement acceptés :*\n• Espèces à la livraison\n• BaridiMob (RIP: ${ps.baridimob_rip}${ps.baridimob_name ? ` — ${ps.baridimob_name}` : ''})`;
      }
      msg += `\n\n📍 Merci de préciser votre nom et votre adresse de livraison.`;
      return msg;
    }

    function open(message) {
      if (!phone) {
        Toast('Numéro WhatsApp non configuré pour cette boutique', 'error');
        return;
      }
      window.open(
        `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
        '_blank', 'noopener',
      );
    }

    return {
      checkoutCart() {
        const s = Cart.state;
        const entries = Object.entries(s);
        if (!entries.length) { Toast('Votre panier est vide', 'error'); return; }
        const lines = entries.map(([id, qty]) => {
          const p = byId(id);
          return p ? `• *${p.name}* × ${qty} = ${formatPrice(p.price * qty)}` : '';
        }).filter(Boolean);
        open(orderMessage(lines, Cart.total(s)));
        trackEvent('whatsapp_click');
      },
      checkoutDirect(id, qty = 1) {
        const p = byId(id);
        if (!p) return;
        const sub = Number(p.price) * qty;
        open(orderMessage(
          [`• *${p.name}* × ${qty} = ${formatPrice(sub)}`, '', 'Merci !'],
          sub,
        ));
        trackEvent('whatsapp_click', id);
      },
    };
  })();

  /* ══════════════════════════════════════════════════════════════════════
     4. TOAST + ANALYTICS — never break the page
     ══════════════════════════════════════════════════════════════════════ */

  function Toast(message, type = '') {
    const host = el('toastContainer');
    if (!host) return;
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ` toast--${type}` : '');
    t.textContent = message;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast--in'));
    setTimeout(() => {
      t.classList.remove('toast--in');
      setTimeout(() => t.remove(), 300);
    }, 2800);
  }

  function animateBadge() {
    const b = el('cartBadge');
    if (!b) return;
    b.classList.remove('bounce');
    requestAnimationFrame(() => b.classList.add('bounce'));
  }

  // ── Init Meta (Facebook) Pixel ──
  if (STORE.facebook_pixel_id && typeof window !== 'undefined') {
    (function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)})(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    try {
      window.fbq('init', String(STORE.facebook_pixel_id).trim());
      window.fbq('track', 'PageView');
    } catch (_) {}
  }

  // ── Init TikTok Pixel ──
  if (STORE.tiktok_pixel_id && typeof window !== 'undefined') {
    (function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var a=d.createElement("script");a.type="text/javascript",a.async=!0,a.src=r+"?sdkid="+e+"&lib="+t;var c=d.getElementsByTagName("script")[0];c.parentNode.insertBefore(a,c)};
      try {
        ttq.load(String(STORE.tiktok_pixel_id).trim());
        ttq.page();
      } catch (_) {}
    })(window, document, 'ttq');
  }

  function trackEvent(type, productId, extra = {}) {
    const p = productId ? byId(productId) : null;
    const price = p ? Number(p.price || 0) : Number(extra.value || 0);

    // Meta Pixel events
    if (window.fbq) {
      try {
        if (type === 'product_view') {
          window.fbq('track', 'ViewContent', { content_name: p?.name, content_ids: [String(productId)], value: price, currency: STORE.currency || 'DZD' });
        } else if (type === 'add_to_cart') {
          window.fbq('track', 'AddToCart', { content_name: p?.name, content_ids: [String(productId)], value: price, currency: STORE.currency || 'DZD' });
        } else if (type === 'whatsapp_click' || type === 'initiate_checkout') {
          window.fbq('track', 'InitiateCheckout', { value: extra.total || price, currency: STORE.currency || 'DZD' });
        } else if (type === 'purchase') {
          window.fbq('track', 'Purchase', { value: extra.total || price, currency: STORE.currency || 'DZD' });
        }
      } catch (_) {}
    }

    // TikTok Pixel events
    if (window.ttq) {
      try {
        if (type === 'product_view') {
          window.ttq.track('ViewContent', { content_id: String(productId), content_name: p?.name, value: price, currency: STORE.currency || 'DZD' });
        } else if (type === 'add_to_cart') {
          window.ttq.track('AddToCart', { content_id: String(productId), content_name: p?.name, value: price, currency: STORE.currency || 'DZD' });
        } else if (type === 'whatsapp_click' || type === 'initiate_checkout') {
          window.ttq.track('InitiateCheckout', { value: extra.total || price, currency: STORE.currency || 'DZD' });
        } else if (type === 'purchase') {
          window.ttq.track('CompletePayment', { value: extra.total || price, currency: STORE.currency || 'DZD' });
        }
      } catch (_) {}
    }

    const apiUrl = STORE.api_url || '';
    if (!apiUrl || !STORE.id) return;
    fetch(`${apiUrl}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ store_id: STORE.id, event_type: type, product_id: productId, metadata: extra }),
      keepalive: true,
    }).catch(() => { /* analytics must never break the page */ });
  }

  /* ══════════════════════════════════════════════════════════════════════
     5. RENDER — cart drawer
     ══════════════════════════════════════════════════════════════════════ */

  function renderCartDrawer() {
    const state = Cart.state;
    const items = Object.entries(state);
    const count = Cart.count(state);
    const total = Cart.total(state);

    const badge    = el('cartBadge');
    const titleCnt = el('cartTitleCount');
    const subtotal = el('cartSubtotal');
    const totalEl  = el('cartTotal');
    const body     = el('cartBody');
    const foot     = el('cartFoot');

    if (badge) {
      badge.textContent = count;
      badge.dataset.count = count;
    }
    if (titleCnt) titleCnt.textContent = count;
    if (subtotal) subtotal.textContent = formatPrice(total);
    if (totalEl)  totalEl.textContent  = formatPrice(total);

    if (!body) return;

    if (!items.length) {
      body.innerHTML = `
        <div class="cart-empty">
          <div class="cart-empty__icon" aria-hidden="true">🛒</div>
          <div class="cart-empty__title">Votre panier est vide</div>
          <p style="font-size:14px">Ajoutez des produits pour commencer vos achats</p>
        </div>`;
      if (foot) foot.style.display = 'none';
      return;
    }
    if (foot) foot.style.display = '';

    body.innerHTML = items.map(([id, qty]) => {
      const p = byId(id);
      if (!p) return '';
      const img = p.images && p.images[0]
        ? `<img class="cart-item__img" src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'cart-item__placeholder',textContent:'🛍️'}))">`
        : `<div class="cart-item__placeholder" aria-hidden="true">🛍️</div>`;
      return `
        <div class="cart-item">
          ${img}
          <div class="cart-item__info">
            <div class="cart-item__name">${escapeHtml(p.name)}</div>
            <div class="cart-item__unit">${formatPrice(p.price)} / unité</div>
            <div class="cart-item__controls">
              <div class="cart-item__qty">
                <button class="cart-qty-btn" data-action="dec" data-id="${escapeHtml(id)}" aria-label="Diminuer">−</button>
                <span class="cart-item__qty-num">${qty}</span>
                <button class="cart-qty-btn" data-action="inc" data-id="${escapeHtml(id)}" aria-label="Augmenter">+</button>
              </div>
              <span class="cart-item__subtotal">${formatPrice(p.price * qty)}</span>
              <button class="cart-item__remove" data-action="rm" data-id="${escapeHtml(id)}" aria-label="Supprimer ${escapeHtml(p.name)}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14a2,2,0,0,1-2,2H8a2,2,0,0,1-2-2L5,6"/>
                  <path d="M10,11v6M14,11v6"/><path d="M9,6V4a1,1,0,0,1,1-1h4a1,1,0,0,1,1,1v2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  /* ══════════════════════════════════════════════════════════════════════
     6. RENDER — product grid + filters
     ══════════════════════════════════════════════════════════════════════ */

  function renderProducts(list) {
    const grid = el('productsGrid');
    if (!grid) return;

    if (!list.length) {
      grid.innerHTML = `
        <div class="empty-catalog">
          <div class="empty-catalog__icon" aria-hidden="true">🔍</div>
          <div class="empty-catalog__title">Aucun produit trouvé</div>
          <p>Essayez une autre catégorie</p>
        </div>`;
      return;
    }

    grid.innerHTML = list.map((p, i) => {
      const oos  = !isInStock(p);
      const disc = p.original_price && p.original_price > p.price
        ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
        : 0;
      const img = (p.images && p.images[0])
        ? `<img class="product-card__img" src="${escapeHtml(p.images[0])}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'product-card__placeholder',textContent:'🛍️'}))">`
        : `<div class="product-card__placeholder" aria-hidden="true">🛍️</div>`;
      const oldPrice = (p.original_price && p.original_price > p.price)
        ? `<span class="price-old">${formatPrice(p.original_price)}</span>` : '';

      return `
        <article class="product-card${oos ? ' out-of-stock' : ''}"
                 data-id="${escapeHtml(p.id)}"
                 data-cat="${escapeHtml(p.category || '')}"
                 style="animation-delay:${Math.min(i * 0.05, 0.6)}s"
                 tabindex="0" role="listitem"
                 aria-label="${escapeHtml(p.name)}, ${formatPrice(p.price)}">
          <div class="product-card__media" data-action="open" data-id="${escapeHtml(p.id)}" role="button" aria-label="Voir ${escapeHtml(p.name)}">
            ${img}
            <div class="product-card__badges">
              ${p.is_featured ? '<span class="badge badge--featured">★ Vedette</span>' : ''}
              ${disc > 0 ? `<span class="badge badge--promo">-${disc}%</span>` : ''}
              ${oos ? '<span class="badge badge--out">Épuisé</span>' : ''}
            </div>
            <button class="product-card__wishlist" data-action="wish" data-id="${escapeHtml(p.id)}" aria-label="Ajouter aux favoris">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </button>
          </div>
          <div class="product-card__body">
            <div class="product-card__category">${escapeHtml(p.category || '')}</div>
            <h3 class="product-card__name">${escapeHtml(p.name)}</h3>
            <p class="product-card__desc">${escapeHtml(p.description || '')}</p>
            <div class="product-card__footer">
              <div class="price-group">
                <span class="price-main">${formatPrice(p.price)}</span>
                ${oldPrice}
              </div>
              <button class="add-btn" data-action="add" data-id="${escapeHtml(p.id)}"
                ${oos ? 'disabled aria-disabled="true"' : ''}
                aria-label="Ajouter ${escapeHtml(p.name)} au panier">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke-linecap="round"/></svg>
                ${oos ? 'Épuisé' : 'Ajouter'}
              </button>
            </div>
          </div>
        </article>`;
    }).join('');
  }

  function buildFilters() {
    const wrap = el('filters');
    if (!wrap) return;
    const cats = [...new Set(PRODUCTS.map((p) => p.category).filter(Boolean))];
    cats.forEach((cat) => {
      const btn = document.createElement('button');
      btn.className = 'filter-btn';
      btn.textContent = cat;
      btn.dataset.cat = cat;
      btn.setAttribute('role', 'tab');
      btn.addEventListener('click', () => filterProducts(cat));
      wrap.appendChild(btn);
    });
  }

  function filterProducts(cat) {
    const list = cat === 'all'
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === cat);
    renderProducts(list);
    document.querySelectorAll('.filter-btn').forEach((b) =>
      b.classList.toggle('active', b.dataset.cat === cat));
    const count = el('productCount');
    if (count) {
      count.textContent = `${list.length} article${list.length !== 1 ? 's' : ''} disponible${list.length !== 1 ? 's' : ''}`;
    }
  }

  /* ══════════════════════════════════════════════════════════════════════
     7. PRODUCT MODAL — detail view, gallery, quantity, direct order
     ══════════════════════════════════════════════════════════════════════ */

  let modalProductId = null;
  let galleryImages  = [];
  let galleryIdx     = 0;

  function updateModalSubtotal() {
    const p = byId(modalProductId);
    const qty = Math.max(1, Number(el('modalQty')?.value) || 1);
    if (p && el('modalSubtotal')) {
      el('modalSubtotal').textContent = 'Total : ' + formatPrice(p.price * qty);
    }
  }

  function changeModalQty(delta) {
    const input = el('modalQty');
    if (!input) return;
    const qty = Math.min(99, Math.max(1, (Number(input.value) || 1) + delta));
    input.value = qty;
    updateModalSubtotal();
  }

  function gallerySet(idx) {
    if (!galleryImages.length) return;
    galleryIdx = (idx + galleryImages.length) % galleryImages.length;
    const main = el('modalMainImg');
    if (main) {
      main.src = galleryImages[galleryIdx] || '';
      main.alt = (byId(modalProductId)?.name || '') + ' — image ' + (galleryIdx + 1);
    }
    document.querySelectorAll('#modalThumbs .modal__thumb').forEach((t, i) => {
      t.classList.toggle('active', i === galleryIdx);
      t.setAttribute('aria-selected', i === galleryIdx ? 'true' : 'false');
    });
  }

  const galleryNext = () => gallerySet(galleryIdx + 1);
  const galleryPrev = () => gallerySet(galleryIdx - 1);

  function openModal(id) {
    const p = byId(id);
    if (!p) return;
    modalProductId = id;

    galleryImages = (p.images || []).filter(Boolean);
    galleryIdx = 0;

    const set = (eid, v) => { const n = el(eid); if (n) n.textContent = v; };
    set('modalCat', p.category || '');
    set('modalName', p.name);
    set('modalDesc', p.description || '');
    if (el('modalPrice')) el('modalPrice').textContent = formatPrice(p.price);

    const oos = !isInStock(p);
    const disc = p.original_price && p.original_price > p.price
      ? Math.round(((p.original_price - p.price) / p.original_price) * 100)
      : 0;
    if (el('modalOldPrice')) {
      el('modalOldPrice').textContent =
        (p.original_price && p.original_price > p.price) ? formatPrice(p.original_price) : '';
      el('modalOldPrice').style.display =
        (p.original_price && p.original_price > p.price) ? '' : 'none';
    }
    if (el('modalDiscount')) {
      el('modalDiscount').textContent = disc > 0 ? `-${disc}%` : '';
      el('modalDiscount').style.display = disc > 0 ? '' : 'none';
    }

    // Gallery
    const mainImg = el('modalMainImg');
    if (mainImg) {
      mainImg.src = galleryImages[0] || '';
      mainImg.alt = p.name;
      mainImg.onerror = () => {
        mainImg.replaceWith(Object.assign(document.createElement('div'), {
          className: 'product-card__placeholder', textContent: '🛍️',
        }));
      };
    }
    const thumbs = el('modalThumbs');
    if (thumbs) {
      thumbs.innerHTML = galleryImages.map((src, i) => `
        <button class="modal__thumb${i === 0 ? ' active' : ''}" data-action="thumb" data-idx="${i}"
                role="tab" aria-selected="${i === 0}" aria-label="Image ${i + 1}">
          <img src="${escapeHtml(src)}" alt="" loading="lazy" onerror="this.parentElement.remove()">
        </button>`).join('');
    }

    // Quantity + stock state
    if (el('modalQty')) el('modalQty').value = 1;
    updateModalSubtotal();
    const addBtn = el('modalAddCartBtn');
    if (addBtn) {
      addBtn.disabled = oos;
      addBtn.setAttribute('aria-disabled', oos ? 'true' : 'false');
      const label = addBtn.lastChild;
      if (label && label.nodeType === 3) label.textContent = oos ? ' Épuisé' : ' Ajouter au panier';
    }

    // Render variants if available
    let varContainer = el('modalVariantsContainer');
    if (!varContainer && el('modalDesc')) {
      varContainer = document.createElement('div');
      varContainer.id = 'modalVariantsContainer';
      varContainer.style.margin = '14px 0';
      el('modalDesc').insertAdjacentElement('afterend', varContainer);
    }
    if (varContainer) {
      if (p.variants && p.variants.length > 0) {
        varContainer.style.display = 'block';
        varContainer.innerHTML = `
          <label style="display:block;font-size:12px;font-weight:600;margin-bottom:6px;opacity:0.8;">Options / Variantes :</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;" id="modalVariantsList">
            ${p.variants.map((v, vIdx) => `
              <button type="button" class="variant-pill-btn ${vIdx === 0 ? 'active' : ''}" data-variant-id="${escapeHtml(v.id)}" style="padding:6px 12px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:${vIdx === 0 ? 'var(--primary, #6366f1)' : 'rgba(255,255,255,0.05)'};color:#fff;font-size:12px;cursor:pointer;">
                ${escapeHtml(v.name)} ${v.price ? `(${formatPrice(v.price)})` : ''}
              </button>
            `).join('')}
          </div>
        `;
        varContainer.querySelectorAll('.variant-pill-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            varContainer.querySelectorAll('.variant-pill-btn').forEach(b => {
              b.classList.remove('active');
              b.style.background = 'rgba(255,255,255,0.05)';
            });
            btn.classList.add('active');
            btn.style.background = 'var(--primary, #6366f1)';
            const chosen = (p.variants || []).find(v => String(v.id) === btn.dataset.variantId);
            if (chosen && chosen.price && el('modalPrice')) {
              el('modalPrice').textContent = formatPrice(chosen.price);
            } else if (el('modalPrice')) {
              el('modalPrice').textContent = formatPrice(p.price);
            }
          });
        });
      } else {
        varContainer.style.display = 'none';
        varContainer.innerHTML = '';
      }
    }

    el('modalOverlay')?.classList.add('open');
    el('productModal')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    trackEvent('product_view', p.id);
  }

  function closeModal() {
    modalProductId = null;
    el('modalOverlay')?.classList.remove('open');
    el('productModal')?.classList.remove('open');
    document.body.style.overflow = '';
  }

  /* ── Wishlist (localStorage, per store) ──────────────────────────────── */

  function toggleWishlist(id, btn) {
    const key = 'wish_' + (STORE.slug || 'default');
    try {
      const w = JSON.parse(localStorage.getItem(key)) || [];
      const has = w.includes(id);
      const next = has ? w.filter((x) => x !== id) : [...w, id];
      localStorage.setItem(key, JSON.stringify(next));
      Toast(has ? '💔 Retiré des favoris' : '❤️ Ajouté aux favoris');
      if (btn) btn.classList.toggle('active', !has);
    } catch { /* localStorage blocked — silent */ }
  }

  /* ══════════════════════════════════════════════════════════════════════
     8. UI SHELL — cart drawer, search, mobile menu, navbar
     ══════════════════════════════════════════════════════════════════════ */

  function toggleCart(force) {
    const drawer  = el('cartDrawer');
    const overlay = el('cartOverlay');
    if (!drawer) return;
    const isOpen = typeof force === 'boolean'
      ? force
      : !drawer.classList.contains('open');
    drawer.classList.toggle('open', isOpen);
    if (overlay) overlay.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  }

  /* ── Search overlay with live results ────────────────────────────────── */

  function openSearch() {
    el('searchOverlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => el('searchInput')?.focus(), 60);
  }

  function closeSearch() {
    el('searchOverlay')?.classList.remove('open');
    const input = el('searchInput');
    if (input) input.value = '';
    if (el('searchResults')) el('searchResults').innerHTML = '';
    document.body.style.overflow = '';
  }

  function handleSearch(q) {
    const results = el('searchResults');
    if (!results) return;
    if (!q.trim()) { results.innerHTML = ''; return; }
    const needle = q.trim().toLowerCase();
    const hits = PRODUCTS.filter((p) =>
      (p.name || '').toLowerCase().includes(needle) ||
      (p.description || '').toLowerCase().includes(needle) ||
      (p.category || '').toLowerCase().includes(needle),
    ).slice(0, 6);

    if (!hits.length) {
      results.innerHTML =
        '<div class="search-result__empty">Aucun résultat pour cette recherche</div>';
      return;
    }
    results.innerHTML = hits.map((p) => {
      const img = p.images && p.images[0]
        ? `<img src="${escapeHtml(p.images[0])}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : '<span class="search-result__emoji">🛍️</span>';
      return `
        <button class="search-result" data-action="open" data-id="${escapeHtml(p.id)}">
          ${img}
          <span class="search-result__name">${escapeHtml(p.name)}</span>
          <span class="search-result__price">${formatPrice(p.price)}</span>
        </button>`;
    }).join('');
  }

  /* ── Mobile menu ─────────────────────────────────────────────────────── */

  function toggleMobileMenu(force) {
    const menu   = el('mobileMenu');
    const burger = el('burgerBtn');
    if (!menu) return;
    const isOpen = typeof force === 'boolean'
      ? force
      : !menu.classList.contains('open');
    menu.classList.toggle('open', isOpen);
    if (burger) {
      burger.classList.toggle('open', isOpen);
      burger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }
  }

  const closeMobileMenu = () => toggleMobileMenu(false);

  /* ── Navbar scroll state ─────────────────────────────────────────────── */

  function initNavbarScroll() {
    const nav = el('navbar');
    if (!nav) return;
    const update = () => nav.classList.toggle('scrolled', window.scrollY > 10);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  /* ══════════════════════════════════════════════════════════════════════
     9. EVENTS — one delegated handler + direct bindings + keyboard
     ══════════════════════════════════════════════════════════════════════ */

  function bindGlobalEvents() {
    // ── Global click delegation (CSP-friendly: no inline onclick) ──
    document.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      const action = actionEl.dataset.action;
      const id = actionEl.dataset.id;

      switch (action) {
        case 'open':
          e.preventDefault();
          openModal(id);
          break;
        case 'add': {
          e.preventDefault();
          e.stopPropagation();
          const qty = Math.max(1, Number(el('modalQty')?.value) || 1);
          const inModal = actionEl.id === 'modalAddCartBtn';
          if (Cart.add(id, inModal ? qty : 1)) {
            const p = byId(id);
            animateBadge();
            Toast(`✅ ${p ? p.name : 'Produit'} ajouté au panier`, 'success');
            if (inModal) closeModal();
          } else {
            Toast('Produit actuellement indisponible', 'error');
          }
          break;
        }
        case 'wish':
          e.preventDefault();
          e.stopPropagation();
          toggleWishlist(id, actionEl);
          break;
        case 'inc': Cart.setQty(id, (Cart.state[id] || 0) + 1); break;
        case 'dec': Cart.setQty(id, (Cart.state[id] || 0) - 1); break;
        case 'rm':  Cart.remove(id); Toast('Article supprimé'); break;
        case 'toggle-cart':    toggleCart(); break;
        case 'close-modal':    closeModal(); break;
        case 'open-search':    e.preventDefault(); openSearch(); break;
        case 'close-search':   closeSearch(); break;
        case 'close-menu':     closeMobileMenu(); break;
        case 'modal-qty':      changeModalQty(Number(actionEl.dataset.delta) || 0); break;
        case 'gallery-prev':   galleryPrev(); break;
        case 'gallery-next':   galleryNext(); break;
        case 'thumb':          gallerySet(Number(actionEl.dataset.idx) || 0); break;
        case 'filter':         filterProducts(actionEl.dataset.cat || 'all'); break;
      }
    });

    // ── Card keyboard support (Enter/Space opens the product) ──
    document.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.product-card')) {
        e.preventDefault();
        openModal(e.target.dataset.id);
      }
    });

    // ── Direct bindings ──
    el('btnCheckout')?.addEventListener('click', (e) => {
      e.preventDefault();
      WhatsApp.checkoutCart();
    });

    el('btnClearCart')?.addEventListener('click', () => {
      Cart.clear();
      Toast('🗑️ Panier vidé');
    });

    el('modalQty')?.addEventListener('input', function () {
      this.value = Math.min(99, Math.max(1, Number(this.value) || 1));
      updateModalSubtotal();
    });

    // Direct order from the modal (Commander via WhatsApp)
    el('modalWaBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const qty = Math.max(1, Number(el('modalQty')?.value) || 1);
      if (modalProductId) WhatsApp.checkoutDirect(modalProductId, qty);
    });

    el('modalOverlay')?.addEventListener('click', closeModal);
    el('cartOverlay')?.addEventListener('click', () => toggleCart(false));

    const searchOverlay = el('searchOverlay');
    if (searchOverlay) {
      searchOverlay.addEventListener('click', (e) => {
        if (e.target === searchOverlay) closeSearch();
      });
    }
    el('searchInput')?.addEventListener('input', function () {
      handleSearch(this.value);
    });

    // ── Keyboard shortcuts ──
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (el('productModal')?.classList.contains('open')) closeModal();
        else if (el('cartDrawer')?.classList.contains('open')) toggleCart(false);
        else if (el('searchOverlay')?.classList.contains('open')) closeSearch();
        else if (el('mobileMenu')?.classList.contains('open')) closeMobileMenu();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
      if (el('productModal')?.classList.contains('open')) {
        if (e.key === 'ArrowRight') galleryNext();
        if (e.key === 'ArrowLeft') galleryPrev();
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     10. THEME MANAGER — 5 selectable themes with persistence
     ─────────────────────────────────────────────────────────────────────
     'boutique' = the store's own injected palette (no overrides).
     Other themes override neutral tokens via CSS (html[data-theme=…]) AND
     derive a harmonised --primary from the store color at runtime, so every
     theme still feels on-brand. Choice persists in localStorage.
     ══════════════════════════════════════════════════════════════════════ */

  const THEMES = [
    { id: 'boutique', label: 'Boutique',    icon: '🏪', desc: 'Les couleurs de votre marque' },
    { id: 'minimal',  label: 'Minimaliste', icon: '⚪', desc: 'Épuré, clair, aéré' },
    { id: 'pastel',   label: 'Pastel',      icon: '🍬', desc: 'Doux, ludique, coloré' },
    { id: 'luxe',     label: 'Luxe',        icon: '👑', desc: 'Noir profond & or élégant' },
    { id: 'dark',     label: 'Sombre',      icon: '🌙', desc: 'Moderne, mode nuit' },
  ];

  const THEME_KEY = 'theme_' + (STORE.slug || 'default');

  /* ── Color helpers: hex → HSL for derivation ── */
  function hexToHsl(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
    if (!m) return { h: 243, s: 47, l: 52 };           // fallback: indigo
    const int = parseInt(m[1], 16);
    const r = ((int >> 16) & 255) / 255;
    const g = ((int >> 8) & 255) / 255;
    const b = (int & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = ((g - b) / d + (g < b ? 6 : 0));
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  const hsl = (c, dh = 0, ds = 0, dl = 0) =>
    `hsl(${(c.h + dh) % 360} ${Math.min(100, Math.max(0, c.s + ds))}% ${Math.min(96, Math.max(4, c.l + dl))}%)`;

  function applyTheme(id, { silent = false } = {}) {
    const root = document.documentElement;
    const theme = THEMES.find((t) => t.id === id) || THEMES[0];

    if (theme.id === 'boutique') {
      delete root.dataset.theme;                       // injected palette wins
      ['--primary', '--bg', '--surface', '--text'].forEach((v) => root.style.removeProperty(v));
    } else {
      root.dataset.theme = theme.id;
      const base = hexToHsl(STORE.primary_color || '#534AB7');

      // Per-theme primary harmonisation (gold stays gold for luxe)
      const primaries = {
        minimal: hsl(base, 0, -25, -2),
        pastel:  hsl(base, 0, -18, 12),
        luxe:    '#d4af37',
        dark:    hsl(base, 0, 5, 14),
      };
      root.style.setProperty('--primary', primaries[theme.id] || '');
    }

    // Re-derive the hero gradient so it always matches the active palette
    const hero = document.querySelector('.hero');
    if (hero) {
      if (theme.id === 'boutique') {
        hero.style.background = '';     // restore template's injected gradient
      } else {
        const primary = getComputedStyle(root).getPropertyValue('--primary').trim() || '#534AB7';
        const deep = theme.id === 'luxe' ? '#0c0c0f'
          : theme.id === 'dark' ? '#10131d'
          : theme.id === 'minimal' ? '#1f2430'
          : theme.id === 'pastel' ? '#3f3a52'
          : '#1e293b';
        hero.style.background = `linear-gradient(135deg, ${primary}, ${deep})`;
      }
    }

    try { localStorage.setItem(THEME_KEY, theme.id); } catch { /* private mode */ }
    document.querySelectorAll('.theme-option').forEach((b) => {
      b.classList.toggle('active', b.dataset.theme === theme.id);
      b.setAttribute('aria-checked', b.dataset.theme === theme.id ? 'true' : 'false');
    });
    if (!silent) Toast(`Thème ${theme.label} activé`);
  }

  function buildThemeSwitcher() {
    if (el('themeSwitcher')) return;

    const wrap = document.createElement('div');
    wrap.id = 'themeSwitcher';
    wrap.innerHTML = `
      <button class="theme-switcher__btn" id="themeSwitcherBtn"
              aria-haspopup="dialog" aria-expanded="false"
              aria-label="Choisir un thème">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="12" cy="12" r="9"/><circle cx="8.5" cy="10" r="1.4" fill="currentColor" stroke="none"/>
          <circle cx="15.5" cy="10" r="1.4" fill="currentColor" stroke="none"/>
          <path d="M8.5 15c1 .9 2.2 1.4 3.5 1.4s2.5-.5 3.5-1.4" stroke-linecap="round"/>
        </svg>
        <span>Thème</span>
      </button>
      <div class="theme-switcher__panel" id="themePanel" role="dialog" aria-label="Choix du thème" hidden>
        <div class="theme-switcher__title">🎨 Apparence</div>
        <div class="theme-switcher__list" role="radiogroup" aria-label="Thèmes disponibles">
          ${THEMES.map((t) => `
            <button class="theme-option" data-theme="${t.id}" role="radio" aria-checked="false">
              <span class="theme-option__icon" aria-hidden="true">${t.icon}</span>
              <span class="theme-option__meta">
                <span class="theme-option__label">${t.label}</span>
                <span class="theme-option__desc">${t.desc}</span>
              </span>
            </button>`).join('')}
        </div>
      </div>`;
    document.body.appendChild(wrap);

    const btn   = el('themeSwitcherBtn');
    const panel = el('themePanel');

    btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = panel.hasAttribute('hidden');
      if (open) panel.removeAttribute('hidden');
      else panel.setAttribute('hidden', '');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (panel && !panel.hasAttribute('hidden') && !wrap.contains(e.target)) {
        panel.setAttribute('hidden', '');
        btn?.setAttribute('aria-expanded', 'false');
      }
    });
    panel?.querySelectorAll('.theme-option').forEach((b) => {
      b.addEventListener('click', () => {
        applyTheme(b.dataset.theme);
        panel.setAttribute('hidden', '');
        btn?.setAttribute('aria-expanded', 'false');
      });
    });

    // Restore saved choice — falls back to the store's configured theme
    let saved = 'boutique';
    try { saved = localStorage.getItem(THEME_KEY) || 'boutique'; } catch { /* ignore */ }
    if (saved === 'boutique' && STORE.theme && THEMES.some((t) => t.id === STORE.theme)) {
      saved = STORE.theme;
    }
    applyTheme(saved, { silent: true });
  }

  /* ══════════════════════════════════════════════════════════════════════
     11. CONTENT FILLERS + PLACEHOLDER SCRUBBER
     ─────────────────────────────────────────────────────────────────────
     Defensive layer: whatever the backend injects (or forgets), the page
     never shows raw {{tokens}} and the dynamic numbers are always right.
     ══════════════════════════════════════════════════════════════════════ */

  function fillDynamicContent() {
    const first = PRODUCTS.find((p) => p.is_featured) || PRODUCTS[0] || null;

    // Footer year
    const yearEl = el('year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    // Product count (subtitle + hero stat target)
    const count = el('productCount');
    if (count && PRODUCTS.length) {
      count.textContent = `${PRODUCTS.length} article${PRODUCTS.length !== 1 ? 's' : ''} disponible${PRODUCTS.length !== 1 ? 's' : ''}`;
    }
    const stat = document.querySelector('.hero__stat-value[data-target]');
    if (stat && /product/i.test(stat.parentElement?.textContent || '')) {
      stat.dataset.target = String(PRODUCTS.length);
    }

    // Hero showcase card (featured / first product)
    const heroName  = el('heroProductName');
    const heroPrice = el('heroProductPrice');
    const heroEmoji = el('heroProductEmoji');
    if (heroName && first)  heroName.textContent  = first.name;
    if (heroPrice && first) heroPrice.textContent = formatPrice(first.price).replace(' DA', '');
    if (heroEmoji) heroEmoji.textContent = '🛍️';
  }

  /** Replace any leftover {{token}} in text nodes with safe defaults. */
  function scrubPlaceholders() {
    const defaults = {
      store_name:        STORE.name || 'Ma Boutique',
      store_slogan:      STORE.description || 'Bienvenue dans notre boutique',
      about_text:        STORE.description || 'Bienvenue dans notre boutique.',
      seo_description:   STORE.description || '',
      year:              String(new Date().getFullYear()),
      product_count:     String(PRODUCTS.length),
      hero_emoji:        '🛍️',
      logo_html:         '',
      category_filters:  '',
      products:          '',
      animation_style:   STORE.animation_style || 'soft',
      primary_color:     STORE.primary_color || '#534AB7',
      bg_color:          '#f8fafc',
      card_color:        '#ffffff',
      text_color:        '#1e293b',
      footer_bg:         '#ffffff',
      footer_text:       '#1e293b',
      hero_gradient:     '',
      hero_product_name: PRODUCTS[0]?.name || 'Notre best-seller',
      hero_product_price: PRODUCTS[0] ? String(Math.round(Number(PRODUCTS[0].price) || 0)) : '—',
      whatsapp_phone:    cleanPhone(STORE.whatsapp_phone || ''),
      store_slug:        STORE.slug || '',
      store_id:          STORE.id || '',
      api_url:           STORE.api_url || '',
      font:              'Inter',
      og_image:          PRODUCTS[0]?.images?.[0] || '',
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const re = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const text = node.nodeValue || '';
      if (!text.includes('{{')) return;
      node.nodeValue = text.replace(re, (_, token) => {
        const key = token.toLowerCase();
        return Object.prototype.hasOwnProperty.call(defaults, key) ? defaults[key] : '';
      });
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     12. EFFECTS — animated counters, hero particles, scroll reveal
     ══════════════════════════════════════════════════════════════════════ */

  function initCounters() {
    const nodes = document.querySelectorAll('.hero__stat-value[data-target]');
    if (!nodes.length) return;

    const animate = (node) => {
      const target = Number(node.dataset.target) || 0;
      if (prefersReducedMotion) { node.textContent = String(target); return; }
      const dur = 1400;
      const t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        node.textContent = String(Math.round(target * eased));
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    if (!('IntersectionObserver' in window)) { nodes.forEach(animate); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animate(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    nodes.forEach((n) => io.observe(n));
  }

  function initParticles() {
    const canvas = el('particles-canvas');
    if (!canvas || prefersReducedMotion) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles = [];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width  = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const COUNT = 36;
    const spawn = () => Array.from({ length: COUNT }, () => ({
      x: Math.random() * canvas.offsetWidth,
      y: Math.random() * canvas.offsetHeight,
      r: Math.random() * 2.2 + 0.8,
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.5,
      a: Math.random() * 0.45 + 0.15,
    }));
    particles = spawn();

    (function draw() {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;
      ctx.clearRect(0, 0, w, h);
      const tint = getComputedStyle(document.documentElement)
        .getPropertyValue('--text').trim() || '#ffffff';
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.globalAlpha = p.a;
        ctx.fillStyle = tint;
        ctx.fill();
        p.x += p.dx; p.y += p.dy;
        if (p.x < 0 || p.x > w) p.dx *= -1;
        if (p.y < 0 || p.y > h) p.dy *= -1;
      });
      ctx.globalAlpha = 1;
      requestAnimationFrame(draw);
    })();
  }

  function initScrollAnim() {
    if ((STORE.animation_style || 'soft') === 'none' || (STORE.animation_style || 'soft') === 'soft') return;
    if (prefersReducedMotion || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.style.animationPlayState = 'running';
        io.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    document.querySelectorAll('.product-card, .about__card').forEach((cardEl) => {
      cardEl.style.animationPlayState = 'paused';
      io.observe(cardEl);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════
     13. BOOTSTRAP
     ══════════════════════════════════════════════════════════════════════ */

  function init() {
    try {
      scrubPlaceholders();
      fillDynamicContent();

      const sorted = [...PRODUCTS].sort(
        (a, b) => (b.is_featured ? 1 : 0) - (a.is_featured ? 1 : 0));
      renderProducts(sorted);
      buildFilters();
      renderCartDrawer();
      Cart.subscribe(renderCartDrawer);
      bindGlobalEvents();

      initNavbarScroll();
      initCounters();
      initParticles();
      initScrollAnim();
      buildThemeSwitcher();

      trackEvent('view');
    } catch (err) {
      // Never let a runtime error take the whole page down silently
      console.error('[storefront] init failed:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Small public API (tests / future integrations)
  window.Storefront = {
    Cart, WhatsApp, openModal, closeModal, filterProducts,
    toggleCart, openSearch, closeSearch, applyTheme, THEMES,
  };
})();