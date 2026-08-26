import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { subscription, store_id } = await req.json();

    if (!subscription?.endpoint || !store_id) {
      return NextResponse.json({ error: "Missing subscription or store_id" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Verify the requester owns this store
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("id", store_id)
      .eq("owner_id", user.id)
      .single();

    if (!store) return NextResponse.json({ error: "Store not found" }, { status: 403 });

    // Upsert subscription (one per endpoint)
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          store_id,
          user_id:      user.id,
          endpoint:     subscription.endpoint,
          p256dh:       subscription.keys?.p256dh,
          auth:         subscription.keys?.auth,
          user_agent:   req.headers.get("user-agent")?.slice(0, 200) ?? null,
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("[push/subscribe]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] unexpected:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = await req.json();
    if (!endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

    const supabase = await getSupabaseServerClient();
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
