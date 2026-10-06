import type { Wilaya } from "@/types/product";

// ─── 58 Wilayas d'Algérie avec tarifs réels Home / StopDesk ──────────────────
export const RAW_WILAYAS = [
  { id: 1, name: "Adrar", price_home: 950, price_desk: 600, eta: "3-5 j" },
  { id: 2, name: "Chlef", price_home: 550, price_desk: 300, eta: "24-48h" },
  { id: 3, name: "Laghouat", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 4, name: "Oum El Bouaghi", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 5, name: "Batna", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 6, name: "Béjaïa", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 7, name: "Biskra", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 8, name: "Béchar", price_home: 950, price_desk: 600, eta: "4-6 j" },
  { id: 9, name: "Blida", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 10, name: "Bouira", price_home: 550, price_desk: 300, eta: "24-48h" },
  { id: 11, name: "Tamanrasset", price_home: 1400, price_desk: 900, eta: "5-8 j" },
  { id: 12, name: "Tébessa", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 13, name: "Tlemcen", price_home: 550, price_desk: 300, eta: "48-72h" },
  { id: 14, name: "Tiaret", price_home: 600, price_desk: 350, eta: "48-72h" },
  { id: 15, name: "Tizi Ouzou", price_home: 600, price_desk: 350, eta: "24-48h" },
  { id: 16, name: "Alger", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 17, name: "Djelfa", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 18, name: "Jijel", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 19, name: "Sétif", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 20, name: "Saïda", price_home: 550, price_desk: 300, eta: "48-72h" },
  { id: 21, name: "Skikda", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 22, name: "Sidi Bel Abbès", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 23, name: "Annaba", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 24, name: "Guelma", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 25, name: "Constantine", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 26, name: "Médéa", price_home: 600, price_desk: 350, eta: "24-48h" },
  { id: 27, name: "Mostaganem", price_home: 450, price_desk: 280, eta: "24-48h" },
  { id: 28, name: "M'Sila", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 29, name: "Mascara", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 30, name: "Ouargla", price_home: 900, price_desk: 550, eta: "3-5 j" },
  { id: 31, name: "Oran", price_home: 400, price_desk: 250, eta: "24-48h" },
  { id: 32, name: "El Bayadh", price_home: 800, price_desk: 500, eta: "3-5 j" },
  { id: 33, name: "Illizi", price_home: 1400, price_desk: 900, eta: "5-8 j" },
  { id: 34, name: "Bordj Bou Arreridj", price_home: 650, price_desk: 350, eta: "2-4 j" },
  { id: 35, name: "Boumerdès", price_home: 550, price_desk: 300, eta: "24-48h" },
  { id: 36, name: "El Tarf", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 37, name: "Tindouf", price_home: 1400, price_desk: 900, eta: "5-8 j" },
  { id: 38, name: "Tissemsilt", price_home: 650, price_desk: 350, eta: "48-72h" },
  { id: 39, name: "El Oued", price_home: 850, price_desk: 500, eta: "3-5 j" },
  { id: 40, name: "Khenchela", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 41, name: "Souk Ahras", price_home: 750, price_desk: 450, eta: "2-4 j" },
  { id: 42, name: "Tipaza", price_home: 550, price_desk: 300, eta: "24-48h" },
  { id: 43, name: "Mila", price_home: 700, price_desk: 400, eta: "2-4 j" },
  { id: 44, name: "Aïn Defla", price_home: 600, price_desk: 350, eta: "24-48h" },
  { id: 45, name: "Naâma", price_home: 800, price_desk: 500, eta: "3-5 j" },
  { id: 46, name: "Aïn Témouchent", price_home: 450, price_desk: 280, eta: "24-48h" },
  { id: 47, name: "Ghardaïa", price_home: 850, price_desk: 500, eta: "3-5 j" },
  { id: 48, name: "Relizane", price_home: 500, price_desk: 300, eta: "24-48h" },
  { id: 49, name: "Timimoun", price_home: 1000, price_desk: 650, eta: "4-6 j" },
  { id: 50, name: "Bordj Badji Mokhtar", price_home: 1500, price_desk: 1000, eta: "6-8 j" },
  { id: 51, name: "Ouled Djellal", price_home: 800, price_desk: 450, eta: "3-5 j" },
  { id: 52, name: "Béni Abbès", price_home: 1000, price_desk: 650, eta: "4-6 j" },
  { id: 53, name: "In Salah", price_home: 1300, price_desk: 850, eta: "5-7 j" },
  { id: 54, name: "In Guezzam", price_home: 1500, price_desk: 1000, eta: "6-8 j" },
  { id: 55, name: "Touggourt", price_home: 900, price_desk: 550, eta: "3-5 j" },
  { id: 56, name: "Djanet", price_home: 1400, price_desk: 900, eta: "5-8 j" },
  { id: 57, name: "El M'Ghair", price_home: 850, price_desk: 500, eta: "3-5 j" },
  { id: 58, name: "El Meniaa", price_home: 950, price_desk: 600, eta: "4-6 j" },
];

export const DEFAULT_WILAYAS: Wilaya[] = RAW_WILAYAS.map((w) => ({
  ...w,
  code: String(w.id).padStart(2, "0"),
}));

export const WILAYAS = DEFAULT_WILAYAS;

export function resolveImageUrl(img: any): string {
  if (!img) return "";
  const rawUrl = typeof img === "string" ? img.trim() : typeof img?.url === "string" ? img.url.trim() : "";
  if (!rawUrl) return "";
  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://") || rawUrl.startsWith("/") || rawUrl.startsWith("data:")) {
    return rawUrl;
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  if (supabaseUrl) {
    return `${supabaseUrl}/storage/v1/object/public/${rawUrl.replace(/^\/+/, "")}`;
  }
  return rawUrl;
}
