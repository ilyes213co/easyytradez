import type { CartItem, Product } from "../app/types";

export class Cart {
  private key: string;
  private items: CartItem[];
  private listeners: Array<(items: CartItem[]) => void> = [];

  constructor(storeSlug: string) {
    this.key = `cart_${storeSlug}`;
    this.items = this._load();
  }

  private _load(): CartItem[] {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem(this.key) ?? "[]") as CartItem[];
    } catch {
      return [];
    }
  }

  private _save() {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.key, JSON.stringify(this.items));
    this._notify();
  }

  private _notify() {
    this.listeners.forEach((fn) => fn([...this.items]));
  }

  subscribe(fn: (items: CartItem[]) => void) {
    this.listeners.push(fn);
    return () => { this.listeners = this.listeners.filter((l) => l !== fn); };
  }

  getItems(): CartItem[] { return [...this.items]; }

  getCount(): number { return this.items.reduce((s, i) => s + i.quantity, 0); }

  getTotal(): number {
    return Math.round(this.items.reduce((s, i) => s + i.price * i.quantity, 0));
  }

  add(product: Product, quantity = 1) {
    const existing = this.items.find((i) => i.id === product.id);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.items.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.images[0]?.url ?? null,
        quantity,
      });
    }
    this._save();
  }

  remove(productId: string) {
    this.items = this.items.filter((i) => i.id !== productId);
    this._save();
  }

  updateQuantity(productId: string, qty: number) {
    if (qty <= 0) { this.remove(productId); return; }
    const item = this.items.find((i) => i.id === productId);
    if (item) { item.quantity = qty; this._save(); }
  }

  clear() { this.items = []; this._save(); }

  // Build WhatsApp message
  buildWhatsAppMessage(storeName: string): string {
    const lines = this.items.map(
      (i) => `🛍️ ${i.quantity}x ${i.name} — ${(i.price * i.quantity).toLocaleString("fr-DZ")} DZD`
    );
    return [
      `Bonjour ${storeName} ! 👋`,
      `Je souhaite commander :`,
      ``,
      ...lines,
      ``,
      `💰 Total : ${this.getTotal().toLocaleString("fr-DZ")} DZD`,
      ``,
      `Mon nom : `,
      `Mon adresse : `,
      ``,
      `Merci de confirmer la disponibilité et le délai de livraison.`,
    ].join("\n");
  }

  buildWhatsAppUrl(phone: string, storeName: string): string {
    const message = this.buildWhatsAppMessage(storeName);
    return generateWhatsAppUrl(phone, message);
  }
}

export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return "";
  let cleaned = String(phone).replace(/\D/g, "");
  if (!cleaned) return "";

  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }

  if (cleaned.startsWith("0213") && cleaned.length >= 12) {
    cleaned = cleaned.slice(1);
  }

  if (cleaned.startsWith("2130") && cleaned.length >= 12) {
    cleaned = `213${cleaned.slice(4)}`;
  }

  if (cleaned.startsWith("0") && cleaned.length >= 9 && cleaned.length <= 11) {
    cleaned = `213${cleaned.slice(1)}`;
  } else if (/^[567]\d{8}$/.test(cleaned)) {
    cleaned = `213${cleaned}`;
  }

  if (/^0[567]\d+$/.test(cleaned)) {
    cleaned = `213${cleaned.slice(1)}`;
  }

  cleaned = cleaned.replace(/^0+/, "");

  return cleaned;
}

export function generateWhatsAppUrl(phone: string, message?: string): string {
  const formatted = formatWhatsAppPhone(phone);
  if (!formatted) return "";
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${formatted}${query}`;
}

// Singleton per store (client-side only)
let _cartInstance: Cart | null = null;

export function getCart(slug: string): Cart {
  if (!_cartInstance) _cartInstance = new Cart(slug);
  return _cartInstance;
}
