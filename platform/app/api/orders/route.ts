import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_WILAYAS } from "@/lib/wilayas";

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
}

// Support CORS pour que les boutiques et funnels déployés sur Vercel puissent soumettre leurs commandes
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      product_id,
      options_selected = {},
      qty = 1,
      wilaya_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_address,
      items: rawItems,
      total_amount: rawTotalAmount,
      notes,
    } = body;

    const shipMode = body.ship_mode || body.shipMode || "domicile";
    let store_id = body.store_id;

    // 1. Validation de base des champs client
    if (!customer_name || typeof customer_name !== "string" || customer_name.trim().length < 2) {
      return NextResponse.json(
        { error: "Le nom du client doit comporter au moins 2 caractères" },
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanPhone = String(customer_phone || "").replace(/\D/g, "");
    if (cleanPhone.length < 9) {
      return NextResponse.json(
        { error: "Numéro de téléphone invalide (au moins 9 chiffres requis)" },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabase = getSupabaseAdmin();

    // 2. Résolution du produit si product_id fourni
    let items = Array.isArray(rawItems) ? rawItems : [];
    let product: any = null;

    if (product_id) {
      const { data: prodData } = await supabase
        .from("products")
        .select("*")
        .eq("id", String(product_id))
        .single();

      if (prodData) {
        product = prodData;
        store_id = store_id || product.store_id;

        if (items.length === 0) {
          items = [
            {
              product_id: product.id,
              name: product.name,
              price: Number(product.price || 0),
              quantity: Math.max(1, Number(qty) || 1),
              options_selected: options_selected || {},
            },
          ];
        }
      }
    }

    // 3. Validation du store_id
    if (!store_id || String(store_id).trim().toLowerCase() in { demo: 1, null: 1, undefined: 1 }) {
      return NextResponse.json(
        { error: "Identifiant de boutique (store_id) manquant pour cette commande" },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Calcul des frais de livraison via Wilaya
    let wilayaName = body.wilaya || "";
    let deliveryCost = 0;

    if (wilaya_id) {
      const wId = Number(wilaya_id);
      const wilayaConfig = DEFAULT_WILAYAS.find((w) => w.id === wId);
      if (wilayaConfig) {
        wilayaName = wilayaConfig.name;
        deliveryCost = shipMode === "stopdesk" ? wilayaConfig.price_desk : wilayaConfig.price_home;
      } else {
        deliveryCost = shipMode === "stopdesk" ? 300 : 500;
      }
    }

    // 5. Calcul du montant total
    let totalAmount = 0;
    if (rawTotalAmount !== undefined && rawTotalAmount !== null && Number(rawTotalAmount) > 0) {
      totalAmount = Number(rawTotalAmount);
    } else if (items.length > 0) {
      const subtotal = items.reduce(
        (sum, item) => sum + Number(item.price || 0) * Math.max(1, Number(item.quantity) || 1),
        0
      );
      totalAmount = subtotal + deliveryCost;
    } else if (product) {
      totalAmount = Number(product.price || 0) * Math.max(1, Number(qty) || 1) + deliveryCost;
    }

    // 6. Formatage de l'adresse et de la note client réelle
    const modeLabel = shipMode === "stopdesk" ? "Stop Desk" : "À domicile";
    const addressParts: string[] = [];
    if (wilayaName) addressParts.push(`Wilaya: ${wilayaName} (${modeLabel})`);
    if (customer_address && String(customer_address).trim()) {
      addressParts.push(String(customer_address).trim());
    }
    const fullAddress = addressParts.join(" — ") || "Non spécifiée";

    // Seule la vraie note libre écrite par le client est conservée
    const cleanCustomerNote =
      typeof notes === "string" && notes.trim().length > 0 ? notes.trim() : null;

    // 7. Insertion de la commande en base avec clé service_role (bypasse RLS)
    const payload = {
      store_id,
      customer_name: customer_name.trim(),
      customer_phone: cleanPhone,
      customer_email: customer_email || null,
      customer_address: fullAddress,
      items,
      total_amount: Math.round(totalAmount),
      status: "pending",
      payment_status: "pending",
      notes: cleanCustomerNote,
    };

    const { data: createdOrder, error: insertError } = await supabase
      .from("orders")
      .insert(payload)
      .select()
      .single();

    if (insertError || !createdOrder) {
      console.error("Erreur insertion commande:", insertError);
      return NextResponse.json(
        { error: "Impossible d'enregistrer la commande", details: insertError?.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // 8. Déduction du stock (non-bloquante)
    try {
      for (const item of items) {
        const prodId = item.product_id || item.id;
        const q = Math.max(1, Number(item.quantity) || 1);
        if (prodId) {
          const { data: pData } = await supabase
            .from("products")
            .select("stock_quantity")
            .eq("id", prodId)
            .single();

          if (pData && pData.stock_quantity !== null && pData.stock_quantity !== undefined) {
            await supabase
              .from("products")
              .update({ stock_quantity: Math.max(0, pData.stock_quantity - q) })
              .eq("id", prodId);
          }
        }
      }
    } catch (e) {
      console.warn("Déduction stock non bloquante:", e);
    }

    return NextResponse.json(
      {
        message: "Commande enregistrée avec succès",
        order_id: createdOrder.id,
        total_amount: totalAmount,
        order: createdOrder,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Erreur route /api/orders:", err);
    return NextResponse.json(
      { error: "Erreur serveur interne lors du traitement de la commande", details: err?.message },
      { status: 500, headers: corsHeaders }
    );
  }
}
