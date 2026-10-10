import { NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const error = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    const loginUrl = new URL("/login", url.origin);
    loginUrl.searchParams.set("error", errorDescription || error);
    return NextResponse.redirect(loginUrl);
  }

  const safeNext = next.startsWith("/") ? next : "/dashboard";
  const redirectResponse = NextResponse.redirect(new URL(safeNext, url.origin));

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options: CookieOptions }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
            redirectResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) {
        console.error("Exchange code error:", exchangeError);
        const loginUrl = new URL("/login", url.origin);
        loginUrl.searchParams.set("error", exchangeError.message);
        return NextResponse.redirect(loginUrl);
      }
    } catch (err: any) {
      console.error("Auth callback unexpected exception on code exchange:", err);
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", "Erreur lors de l'authentification.");
      return NextResponse.redirect(loginUrl);
    }
  } else if (token_hash && type) {
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });
      if (verifyError) {
        console.error("Verify OTP error:", verifyError);
        const loginUrl = new URL("/login", url.origin);
        loginUrl.searchParams.set("error", verifyError.message);
        return NextResponse.redirect(loginUrl);
      }
    } catch (err: any) {
      console.error("Auth callback unexpected exception on verifyOtp:", err);
      const loginUrl = new URL("/login", url.origin);
      loginUrl.searchParams.set("error", "Erreur lors de la validation du lien.");
      return NextResponse.redirect(loginUrl);
    }
  }

  return redirectResponse;
}



