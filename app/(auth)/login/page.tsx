"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// ─── Icons (inline SVG to avoid extra deps) ───────────────────────────────────

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.705A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.705V4.963H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.037l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.963L3.964 7.295C4.672 5.169 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const supabase = getSupabaseBrowserClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Check if already authenticated ────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace(redirectTo);
    });
  }, [supabase, router, redirectTo]);

  // ── Email / Password sign-in ──────────────────────────────────────────────
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(translateError(signInError.message));
      setLoading(false);
      return;
    }

    router.push(redirectTo);
  };

  // ── Google OAuth ──────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError(null);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });

    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
    }
    // On success, Supabase redirects automatically
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
      {/* Background mesh */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99,102,241,0.15) 0%, transparent 60%)",
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Card */}
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl"
          style={{ boxShadow: "0 0 80px rgba(99,102,241,0.05)" }}
        >
          {/* Logo / Brand */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"
                  stroke="#818cf8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path d="M16 11h2M6 11h2" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M12 3v4M12 17v4" stroke="#818cf8" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h1
              className="text-xl font-semibold text-white tracking-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Bienvenue sur Marchand
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Connectez-vous à votre espace marchand
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <svg
                className="mt-0.5 shrink-0 text-red-400"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/80 transition-all hover:bg-white/[0.08] hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Spinner />
            ) : (
              <>
                <GoogleIcon />
                Se connecter avec Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-xs text-white/25 uppercase tracking-widest">ou</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider"
              >
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-white/50 uppercase tracking-wider"
                >
                  Mot de passe
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 pr-11 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ boxShadow: "0 0 20px rgba(99,102,241,0.25)" }}
            >
              {loading ? <Spinner /> : "Se connecter"}
            </button>
          </form>

          {/* Register link */}
          <p className="mt-6 text-center text-sm text-white/35">
            Pas encore de compte ?{" "}
            <Link
              href="/register"
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Créer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function translateError(msg: string): string {
  if (msg.includes("Invalid login credentials"))
    return "Email ou mot de passe incorrect.";
  if (msg.includes("Email not confirmed"))
    return "Veuillez confirmer votre adresse e-mail avant de vous connecter.";
  if (msg.includes("Too many requests"))
    return "Trop de tentatives. Réessayez dans quelques minutes.";
  return msg;
}
