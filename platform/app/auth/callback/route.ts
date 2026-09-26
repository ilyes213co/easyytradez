import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.exchangeCodeForSession(code);
    } catch (err) {
      console.error("[StoreGen Auth] Failed to exchange code for session:", err);
      return NextResponse.redirect(new URL(`/login?error=auth_callback_failed`, url.origin));
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

