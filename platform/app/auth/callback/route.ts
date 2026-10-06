import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  if (code) {
    try {
      const supabase = await createServerSupabaseClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("Exchange code error:", exchangeError);
        const loginUrl = new URL("/login", url.origin);
        loginUrl.searchParams.set("error", exchangeError.message);
        return NextResponse.redirect(loginUrl);
      }
    } catch (err: any) {
      console.error("Auth callback unexpected exception:", err);
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", "Erreur lors de l'authentification.");
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

