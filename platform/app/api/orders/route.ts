import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Client Supabase avec les droits d'administration (service role) pour enregistrer et lire sans blocage
function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// ── GET: Récupérer les commandes d'une boutique ─────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("store_id");

    const supabase = getAdminSupabase();

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (storeId) {
      query = query.eq("store_id", storeId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, orders: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Erreur serveur" }, { status: 500 });
  }
}

// ── POST: Enregistrer une nouvelle commande client ───────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let {
      store_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      wilaya,
      items,
      total_amount,
      notes,
    } = body;

    const supabase = getAdminSupabase();

    // Si le store_id est manquant ou en mode démo, on rattache à la boutique la plus récente
    if (!store_id || store_id === "demo" || store_id.startsWith("{{")) {
      const { data: stores } = await supabase
        .from("stores")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1);

      if (stores && stores.length > 0) {
        store_id = stores[0]?.id;
      }
    }

    if (!store_id) {
      return NextResponse.json({ success: false, error: "Boutique introuvable" }, { status: 400 });
    }

    if (!customer_name || !customer_phone) {
      return NextResponse.json(
        { success: false, error: "Nom et numéro de téléphone obligatoires" },
        { status: 400 }
      );
    }

    const fullAddress = wilaya
      ? `Wilaya ${wilaya}${customer_address ? " — " + customer_address : ""}`
      : customer_address || "Non spécifiée";

    const formattedItems = Array.isArray(items) && items.length > 0
      ? items.map((i: any) => ({
          name: i.name || i.title || "Produit",
          price: Number(i.price) || 0,
          quantity: Number(i.quantity || i.qty) || 1,
          image: i.image || null,
        }))
      : [{ name: "Commande Express", price: Number(total_amount) || 0, quantity: 1 }];

    const orderPayload = {
      store_id,
      customer_name: String(customer_name).trim(),
      customer_phone: String(customer_phone).trim(),
      customer_email: customer_email || null,
      customer_address: fullAddress,
      items: formattedItems,
      total_amount: Number(total_amount) || 0,
      status: "pending",
      payment_status: "pending",
      notes: notes || null,
    };

    const { data: newOrder, error } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (error) {
      console.error("Erreur insertion commande:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, order: newOrder }, { status: 201 });
  } catch (err: any) {
    console.error("Erreur serveur lors de la commande:", err);
    return NextResponse.json({ success: false, error: err?.message || "Erreur interne" }, { status: 500 });
  }
}
