import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser } from "@/lib/api-auth";
import { RAW_WILAYAS } from "@/lib/wilayas";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const priceHome = body.price_home !== undefined ? Number(body.price_home) : 600;
    const priceDesk = body.price_desk !== undefined ? Number(body.price_desk) : 350;
    const isFree = Boolean(body.is_free);
    const customWilayas: Record<number, { price_home?: number; price_desk?: number }> =
      body.custom_wilayas || {};

    const effectiveHome = isFree ? 0 : priceHome;
    const effectiveDesk = isFree ? 0 : priceDesk;

    const admin = getAdminClient();

    // 1. Récupérer tous les stores et funnels appartenant à l'utilisateur
    const { data: userStores, error: storeErr } = await admin
      .from("stores")
      .select("id, name, type, settings")
      .eq("owner_id", user.id);

    if (storeErr) throw storeErr;

    if (!userStores || userStores.length === 0) {
      return NextResponse.json(
        { detail: "Aucune boutique ou funnel trouvé pour votre compte" },
        { status: 404 }
      );
    }

    // 2. Mettre à jour les tarifs dans shipping_rates pour chaque store
    const allUpdates: Array<{
      store_id: string;
      wilaya_id: number;
      price_home: number;
      price_desk: number;
      updated_at: string;
    }> = [];

    const nowIso = new Date().toISOString();

    for (const store of userStores) {
      for (const w of RAW_WILAYAS) {
        const custom = customWilayas[w.id];
        const finalHome =
          custom?.price_home !== undefined
            ? Number(custom.price_home)
            : effectiveHome !== undefined
            ? effectiveHome
            : w.price_home;

        const finalDesk =
          custom?.price_desk !== undefined
            ? Number(custom.price_desk)
            : effectiveDesk !== undefined
            ? effectiveDesk
            : w.price_desk;

        allUpdates.push({
          store_id: store.id,
          wilaya_id: w.id,
          price_home: finalHome,
          price_desk: finalDesk,
          updated_at: nowIso,
        });
      }

      // Sauvegarde des réglages de livraison manuelle dans store.settings
      const currentSettings =
        store.settings && typeof store.settings === "object" ? store.settings : {};
      const updatedSettings = {
        ...currentSettings,
        manual_shipping: {
          price_home: effectiveHome,
          price_desk: effectiveDesk,
          is_free: isFree,
          custom_wilayas: customWilayas,
          updated_at: nowIso,
        },
      };

      await admin
        .from("stores")
        .update({ settings: updatedSettings })
        .eq("id", store.id);
    }

    // Upsert par lots de 250 lignes dans shipping_rates
    const chunkSize = 250;
    for (let i = 0; i < allUpdates.length; i += chunkSize) {
      const chunk = allUpdates.slice(i, i + chunkSize);
      await admin.from("shipping_rates").upsert(chunk, {
        onConflict: "store_id,wilaya_id",
      });
    }

    return NextResponse.json({
      success: true,
      stores_count: userStores.length,
      message: `Tarifs de livraison appliqués avec succès à l'ensemble de vos ${userStores.length} funnels et boutiques !`,
      applied: {
        price_home: effectiveHome,
        price_desk: effectiveDesk,
        is_free: isFree,
      },
    });
  } catch (err: any) {
    console.error("apply-all shipping rates error:", err);
    return NextResponse.json(
      { detail: err.message || "Erreur lors de l'application des tarifs de livraison" },
      { status: 500 }
    );
  }
}
