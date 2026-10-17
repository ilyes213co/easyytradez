import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { DEFAULT_WILAYAS } from "@/lib/wilayas";
import { normalizeDzPhone, isValidStrictDzPhone } from "@/lib/utils";

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

    // Récupération de la boutique et de ses paramètres de sécurité
    const { data: storeData } = await supabase
      .from("stores")
      .select("id, name, status, settings")
      .eq("id", store_id)
      .maybeSingle();

    if (!storeData) {
      return NextResponse.json(
        { error: "Boutique introuvable pour cette commande" },
        { status: 404, headers: corsHeaders }
      );
    }

    if (storeData.status === "suspended") {
      return NextResponse.json(
        { error: "Cette boutique est actuellement suspendue" },
        { status: 403, headers: corsHeaders }
      );
    }

    const storeSettings = (storeData.settings as any) || {};
    const security = storeSettings.security || {};

    // ─── Sécurité COD & Anti-Fake Orders (Spécial Algérie) ───────────────────
    const cleanPhone = normalizeDzPhone(customer_phone);

    // A. Validation stricte numéro DZ (10 chiffres commençant par 05, 06 ou 07)
    if (security.strict_dz_phone !== false) {
      if (!isValidStrictDzPhone(cleanPhone)) {
        return NextResponse.json(
          {
            error:
              "Numéro de téléphone algérien invalide. Il doit comporter 10 chiffres et commencer obligatoirement par 05, 06 ou 07.",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    } else if (cleanPhone.length < 9) {
      return NextResponse.json(
        { error: "Numéro de téléphone invalide (au moins 9 chiffres requis)" },
        { status: 400, headers: corsHeaders }
      );
    }

    // B. Vérification Liste Noire (Blacklist)
    const blacklist: string[] = Array.isArray(security.blacklist) ? security.blacklist : [];
    if (blacklist.length > 0) {
      const normalizedBlacklist = new Set(blacklist.map((b) => normalizeDzPhone(b)).filter(Boolean));
      if (normalizedBlacklist.has(cleanPhone)) {
        return NextResponse.json(
          {
            error:
              "Ce numéro de téléphone n'est pas autorisé à passer commande sur cette boutique.",
          },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // C. Anti-Spam commandes (limite à 2 commandes sur 24h par numéro)
    if (security.anti_spam_orders) {
      const cutoff24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("id, customer_phone")
        .eq("store_id", store_id)
        .gte("created_at", cutoff24h);

      const matching = (recentOrders || []).filter(
        (o: any) => normalizeDzPhone(o.customer_phone) === cleanPhone
      );
      if (matching.length >= 2) {
        return NextResponse.json(
          {
            error:
              "Limite de commandes atteinte pour ce numéro dans les dernières 24h. Veuillez patienter ou contacter le service client.",
          },
          { status: 400, headers: corsHeaders }
        );
      }
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

    // 9. Alerte Telegram instantanée (non-bloquante)
    try {
      const telegramChatId = storeSettings?.notifications?.telegram_chat_id?.trim();
      const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
      if (telegramChatId && botToken) {
        const itemsList = Array.isArray(items) ? items : [];
        const itemsStr =
          itemsList
            .map(
              (it: any) =>
                `  • ${it.name || "Article"} × ${it.quantity || 1} (${Number(it.price || 0).toLocaleString("fr-DZ")} DZD)`
            )
            .join("\n") || "  • 1x Commande directe";
        const ref = String(createdOrder.id || "").slice(-6).toUpperCase();
        const text = [
          `🛍️ <b>Nouvelle commande reçue !</b>`,
          ``,
          `🏪 <b>Boutique :</b> ${storeData.name || "Boutique"}`,
          `🔖 <b>Réf :</b> #${ref}`,
          ``,
          `📦 <b>Articles :</b>\n${itemsStr}`,
          ``,
          `👤 <b>Client :</b> ${createdOrder.customer_name}`,
          `📞 <b>Téléphone :</b> <code>${createdOrder.customer_phone}</code>`,
          `📍 <b>Adresse / Wilaya :</b> ${createdOrder.customer_address || "Non spécifiée"}`,
          `💰 <b>Total C.O.D :</b> <b>${Number(totalAmount).toLocaleString("fr-DZ")} DZD</b>`,
          cleanCustomerNote ? `📝 <b>Note :</b> ${cleanCustomerNote}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        // Envoi asynchrone fire-and-forget sans ralentir le retour HTTP
        fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: telegramChatId,
            text,
            parse_mode: "HTML",
          }),
        }).catch((err) => {
          console.warn("Échec alerte Telegram (non bloquant):", err?.message || err);
        });
      }
    } catch (e) {
      console.warn("Erreur préparation alerte Telegram:", e);
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
