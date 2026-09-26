import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function isValidMiddlewareSupabaseUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return (
      !host.includes("your-project") &&
      !host.includes("placeholder") &&
      !host.endsWith(".coy") &&
      host.includes(".")
    );
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const publicRoutes = ["/login", "/register", "/auth/callback"];
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  const isDashboard = pathname.startsWith("/dashboard");
  const isSlug =
    !isDashboard &&
    !pathname.startsWith("/api") &&
    !isPublic &&
    pathname !== "/";
  const hasAuthCookies = request.cookies
    .getAll()
    .some(
      ({ name }) =>
        name.startsWith("sb-") &&
        (name.includes("-auth-token") || name.includes("-auth-token-code-verifier"))
    );

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const isConfigValid = isValidMiddlewareSupabaseUrl(rawUrl) && Boolean(rawKey);

  // If Supabase config is missing or invalid, do not attempt network auth requests
  if (!isConfigValid) {
    if (isDashboard) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({ request });
  }

  // Avoid a Supabase roundtrip for anonymous public requests.
  if (isSlug || (isPublic && !hasAuthCookies) || (pathname === "/" && !hasAuthCookies)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    rawUrl!,
    rawKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  let user = null;
  try {
    const timeoutPromise = new Promise<{ data: { user: null }; error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error("Supabase auth middleware timeout")), 3000)
    );

    const { data, error } = await Promise.race([
      supabase.auth.getUser(),
      timeoutPromise,
    ]);

    if (!error && data?.user) {
      user = data.user;
    }
  } catch {
    user = null;
  }

  // If unauthenticated on a public page, strip obsolete auth cookies to avoid repeated RSC network stalls
  if (!user && hasAuthCookies && isPublic) {
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith("sb-") && (name.includes("-auth-token") || name.includes("-auth-token-code-verifier"))) {
        supabaseResponse.cookies.delete(name);
      }
    });
  }

  if (pathname === "/") {
    if (user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return supabaseResponse;
  }

  if (pathname.startsWith("/dashboard") && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic && user && pathname !== "/auth/callback") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
