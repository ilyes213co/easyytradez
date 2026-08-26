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
    const cleaned = phone.replace(/\D/g, "");
    const message = this.buildWhatsAppMessage(storeName);
    return `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`;
  }
}

// Singleton per store (client-side only)
let _cartInstance: Cart | null = null;

export function getCart(slug: string): Cart {
  if (!_cartInstance) _cartInstance = new Cart(slug);
  return _cartInstance;
}
