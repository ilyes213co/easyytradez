import { NextRequest, NextResponse } from "next/server";
import { getAdminClient, getAuthUser, verifyStoreOwner, safeInsert } from "@/lib/api-auth";
import { getUserPlan } from "@/lib/plan-limits-server";

function isTableMissingError(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return (
    msg.includes("relation \"store_members\" does not exist") ||
    msg.includes("relation 'store_members' does not exist") ||
    msg.includes("could not find the table") ||
    err?.code === "42P01" ||
    err?.code === "PGRST205"
  );
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const storeId = searchParams.get("store_id");
    if (!storeId) {
      return NextResponse.json({ detail: "store_id est requis" }, { status: 400 });
    }

    const admin = getAdminClient();
    const check = await verifyStoreOwner(storeId, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    const { data: members, error } = await admin
      .from("store_members")
      .select("*")
      .or(`owner_id.eq.${user.id},store_id.eq.${storeId}`)
      .order("created_at", { ascending: false });


    if (error) {
      if (isTableMissingError(error)) {
        return NextResponse.json({ success: true, members: [] });
      }
      return NextResponse.json({ detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, members: members || [] });
  } catch (err: any) {
    if (isTableMissingError(err)) {
      return NextResponse.json({ success: true, members: [] });
    }
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ detail: "Non authentifié" }, { status: 401 });
    }

    const body = await req.json();
    const storeId = body.store_id;
    const userEmail = (body.user_email || body.email || "").trim().toLowerCase();
    const role = body.role || "manager";

    if (!storeId || !userEmail) {
      return NextResponse.json({ detail: "store_id et email sont requis" }, { status: 400 });
    }

    const admin = getAdminClient();

    // 1. Vérification de propriété
    const check = await verifyStoreOwner(storeId, user.id, admin);
    if (!check.ok) {
      return NextResponse.json({ detail: check.message }, { status: check.status });
    }

    // 2. Gating Plan Business
    const userPlan = await getUserPlan(user.id, admin);
    if (!userPlan.canUseTeam) {
      return NextResponse.json(
        {
          detail: "PLAN_LIMIT_REACHED",
          code: "PLAN_LIMIT_REACHED",
          message:
            "La gestion des collaborateurs et de l'équipe est une fonctionnalité réservée au Pack Business. Passez à Business pour inviter des membres !",
          limit_type: "team",
          current: 0,
          limit: 0,
        },
        { status: 403 }
      );
    }

    const memberPayload = {
      owner_id: user.id,
      store_id: storeId,
      email: userEmail,
      user_email: userEmail,
      role,
      status: "invited",
      is_active: true,
    };

    // 3. Vérification des doublons
    try {
      const { data: existing } = await admin
        .from("store_members")
        .select("id")
        .or(`owner_id.eq.${user.id},store_id.eq.${storeId}`)
        .or(`email.eq.${userEmail},user_email.eq.${userEmail}`);


      if (existing && existing.length > 0) {
        return NextResponse.json(
          { detail: "Ce collaborateur est déjà invité ou associé à cette boutique." },
          { status: 400 }
        );
      }
    } catch (checkErr: any) {
      if (isTableMissingError(checkErr)) {
        return NextResponse.json({
          success: true,
          member: { id: "simulated-" + Date.now(), ...memberPayload, created_at: new Date().toISOString() },
          simulated: true,
        });
      }
    }

    // 4. Insertion résiliente
    const insertRes = await safeInsert("store_members", memberPayload, admin);
    if (insertRes.error) {
      if (isTableMissingError(insertRes.error)) {
        return NextResponse.json({
          success: true,
          member: { id: "simulated-" + Date.now(), ...memberPayload, created_at: new Date().toISOString() },
          simulated: true,
        });
      }
      return NextResponse.json({ detail: insertRes.error?.message || "Erreur insertion" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      member: insertRes.data || memberPayload,
    });
  } catch (err: any) {
    if (isTableMissingError(err)) {
      return NextResponse.json({
        success: true,
        member: { id: "simulated-" + Date.now(), ...req, created_at: new Date().toISOString() },
        simulated: true,
      });
    }
    return NextResponse.json({ detail: err.message || "Erreur interne" }, { status: 500 });
  }
}
