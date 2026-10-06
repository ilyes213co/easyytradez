import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner } from "@/lib/api-auth";
import crypto from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: { storeId: string } }
) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const { storeId } = params;
    const admin = getAdminClient();
    const check = await verifyStoreOwner(storeId, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const store = check.store;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://easytradez.site";
    const publishedUrl = `${baseUrl}/${store.slug}`;

    // Mark store as published and set published_url
    await admin
      .from("stores")
      .update({
        status: "published",
        published_url: publishedUrl,
      })
      .eq("id", storeId);

    const jobId = crypto.randomUUID();

    // Persist deploy job
    try {
      await admin.from("deploy_jobs").insert({
        id: jobId,
        store_id: storeId,
        user_id: user.id,
        status: "ready",
        url: publishedUrl,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
    } catch (jobErr) {
      console.warn("Could not persist to deploy_jobs table:", jobErr);
    }

    return NextResponse.json({
      job_id: jobId,
      message: "Déploiement réussi ! Votre boutique est en ligne.",
      status: "ready",
      url: publishedUrl,
    });
  } catch (err: any) {
    console.error("POST /api/deploy/[storeId] error:", err);
    return NextResponse.json({ detail: err.message || "Erreur lors du déploiement" }, { status: 500 });
  }
}
