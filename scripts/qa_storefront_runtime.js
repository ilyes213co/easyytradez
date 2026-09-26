/**
 * QA — storefront.js boot smoke test under a minimal DOM stub.
 * Proves the runtime can INITIALIZE and the cart actually works, without a
 * browser. Exits non-zero if anything throws.
 *
 * Usage: node scripts/qa_storefront_runtime.js
 */

"use strict";

// ── Product fixture (mirrors the backend's injected shape) ────────────────
const PRODUCTS = [
  {
    id: "a1b2c3d4-e5f6-4a5b-9c8d-111111111111",
    name: "Gâteau au chocolat",
    price: 3500,
    original_price: 4200,
    category: "Gâteaux",
    description: "Moelleux chocolat noir 70%.",
    is_featured: true,
    stock_quantity: 12,
    images: ["https://img.example.com/cake1.jpg"],
  },
  {
    id: "b2c3d4e5-f6a7-4b5c-9d8e-222222222222",
    name: "Cupcakes vanille",
    price: 900,
    category: "Desserts",
    description: "Lot de 6 cupcakes vanille.",
    is_featured: false,
    stock_quantity: 30,
    images: [],
  },
];

// ── Minimal DOM stub ─────────────────────────────────────────────────────
const root = { dataset: {}, style: { setProperty() {}, removeProperty() {} } };

const storage = new Map();
const localStorage = {
  getItem(k) { return storage.has(k) ? storage.get(k) : null; },
  setItem(k, v) { storage.set(k, String(v)); },
};

const noopCb = () => [];
const makeEl = () => ({
  dataset: {}, style: {}, innerHTML: "", textContent: "",
  value: "1", disabled: false, id: "",
  classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
  setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
  hasAttribute() { return false; },
  addEventListener() {}, querySelectorAll() { return []; },
  appendChild() {}, contains() { return false; },
});

const ids = new Map();
ids.set("productsGrid", makeEl());
ids.set("cartBody", makeEl());
ids.set("filters", makeEl());
ids.set("toastContainer", makeEl());
ids.set("cartBadge", makeEl());

const windowObj = {
  STORE_DATA: {
    id: "cf05c2c6", name: "Cake me away", slug: "cake-me-away",
    whatsapp_phone: "+213555123456", primary_color: "#d472a0",
    theme: "pastel", animation_style: "soft", api_url: "",
  },
  PRODUCTS_DATA: PRODUCTS,
  matchMedia() { return { matches: false }; },
  open() {},
};

const documentObj = {
  readyState: "complete",
  documentElement: root,
  body: Object.assign(makeEl(), { appendChild() {} }),
  getElementById(id) { return ids.has(id) ? ids.get(id) : null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  createElement() { return makeEl(); },
  createTreeWalker() { return { nextNode: () => null }; },
  addEventListener() {}, removeEventListener() {}, dispatchEvent() { return true; },
};

global.window = windowObj;
global.document = documentObj;
global.localStorage = localStorage;
global.NodeFilter = { SHOW_TEXT: 4 };
global.requestAnimationFrame = () => 0;
global.performance = { now: () => Date.now() };
global.IntersectionObserver = class { observe() {} unobserve() {} };
global.fetch = async () => ({ ok: true });
global.CustomEvent = class {
  constructor(type, init) { this.type = type; this.detail = init && init.detail; }
};

// ── Boot the runtime (this is where a regression would throw) ─────────────
require("../store-template/storefront.js");

const sf = windowObj.Storefront;
if (!sf) { console.error("FAIL: window.Storefront not exported"); process.exit(1); }
console.log("init() booted OK — window.Storefront keys:", Object.keys(sf).length);

// ── Cart behaviour (the historical Buy-button bug: UUID ids) ─────────────
sf.Cart.clear();
const ok = sf.Cart.add(PRODUCTS[0].id);            // UUID string id
if (!ok) { console.error("FAIL: Cart.add returned false"); process.exit(1); }
if (sf.Cart.count() !== 1) { console.error("FAIL: count != 1"); process.exit(1); }
if (sf.Cart.total() !== 3500) { console.error("FAIL: total != 3500"); process.exit(1); }
sf.Cart.setQty(PRODUCTS[0].id, 3);
if (sf.Cart.total() !== 10500) { console.error("FAIL: total != 10500"); process.exit(1); }
sf.Cart.add(PRODUCTS[1].id);                       // second product
if (sf.Cart.count() !== 4) { console.error("FAIL: count != 4"); process.exit(1); }
sf.Cart.remove(PRODUCTS[0].id);
if (sf.Cart.count() !== 1) { console.error("FAIL: count != 1 after remove"); process.exit(1); }

// ── Theme system ─────────────────────────────────────────────────────────
const themeIds = sf.THEMES.map((t) => t.id);
for (const id of ["boutique", "minimal", "pastel", "luxe", "dark"]) {
  if (!themeIds.includes(id)) { console.error("FAIL: theme missing:", id); process.exit(1); }
}
sf.applyTheme("dark", { silent: true });
if (root.dataset.theme !== "dark") { console.error("FAIL: dataset.theme != dark"); process.exit(1); }
sf.applyTheme("boutique", { silent: true });
if ("theme" in root.dataset) { console.error("FAIL: boutique left data-theme behind"); process.exit(1); }

console.log("ALL RUNTIME CHECKS PASSED ✅");
process.exit(0);