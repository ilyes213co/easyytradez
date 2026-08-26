import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

/**
 * This route is called by Supabase after a successful OAuth sign-in.
 * It exchanges the code for a session and redirects the user.
 *
 * Registered redirect URL in Supabase dashboard:
 *   http://localhost:3000/auth/callback
 *   https://yourdomain.com/auth/callback
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful OAuth login → redirect to intended destination
      return NextResponse.redirect(`${origin}${next}`);
    }

    console.error("[auth/callback] exchangeCodeForSession error:", error.message);
  }

  // Exchange failed or no code provided → redirect to error page
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
