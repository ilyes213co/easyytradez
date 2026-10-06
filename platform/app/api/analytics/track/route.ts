import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/api-auth";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { store_id, event_type, product_id, source, metadata } = body;

    if (!store_id || !event_type) {
      return NextResponse.json({ detail: "store_id and event_type required" }, { status: 400, headers: corsHeaders });
    }

    const admin = getAdminClient();
    await admin.from("store_analytics").insert({
      store_id,
      event_type,
      product_id: product_id || null,
      metadata: { ...(metadata || {}), source: source || "direct" },
    });

    return NextResponse.json({ ok: true }, { headers: corsHeaders });
  } catch (err: any) {
    return NextResponse.json({ ok: false }, { status: 200, headers: corsHeaders });
  }
}
