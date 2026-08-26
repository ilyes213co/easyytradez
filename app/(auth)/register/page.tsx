"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase";

// ─── Validation ───────────────────────────────────────────────────────────────

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  whatsapp?: string;
}

function validate(fields: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  whatsapp: string;
}): FormErrors {
  const errors: FormErrors = {};

  if (!fields.firstName.trim()) errors.firstName = "Prénom requis";
  if (!fields.lastName.trim()) errors.lastName = "Nom requis";

  if (!fields.email.trim()) {
    errors.email = "E-mail requis";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email)) {
    errors.email = "E-mail invalide";
  }

  if (!fields.password) {
    errors.password = "Mot de passe requis";
  } else if (fields.password.length < 8) {
    errors.password = "Minimum 8 caractères";
  } else if (!/[A-Z]/.test(fields.password)) {
    errors.password = "Doit contenir au moins une majuscule";
  } else if (!/[0-9]/.test(fields.password)) {
    errors.password = "Doit contenir au moins un chiffre";
  }

  if (fields.confirmPassword !== fields.password) {
    errors.confirmPassword = "Les mots de passe ne correspondent pas";
  }

  if (fields.whatsapp && !/^\+?[\d\s\-]{8,15}$/.test(fields.whatsapp)) {
    errors.whatsapp = "Numéro invalide (ex: +213 6 00 00 00 00)";
  }

  return errors;
}

// ─── Password strength meter ──────────────────────────────────────────────────

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: "Très faible", color: "#ef4444" };
  if (score === 2) return { score, label: "Faible", color: "#f97316" };
  if (score === 3) return { score, label: "Moyen", color: "#eab308" };
  if (score === 4) return { score, label: "Fort", color: "#22c55e" };
  return { score, label: "Très fort", color: "#10b981" };
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/50 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      {children}
      {error && (
        <p className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-indigo-500/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-indigo-500/10";

const inputErrorClass =
  "w-full rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-all focus:border-red-500/60 focus:ring-2 focus:ring-red-500/10";

// ─── Component ────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    whatsapp: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const strength = getPasswordStrength(form.password);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
    if (touched[key]) {
      const newErrors = validate({ ...form, [key]: e.target.value });
      setErrors((prev) => ({ ...prev, [key]: newErrors[key as keyof FormErrors] }));
    }
  };

  const blur = (key: string) => () => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const newErrors = validate(form);
    setErrors((prev) => ({ ...prev, [key]: newErrors[key as keyof FormErrors] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setTouched({ firstName: true, lastName: true, email: true, password: true, confirmPassword: true, whatsapp: true });
      return;
    }

    setLoading(true);

    // 1. Create auth user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: {
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
        },
      },
    });

    if (signUpError) {
      setServerError(translateError(signUpError.message));
      setLoading(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      setServerError("Erreur inattendue. Veuillez réessayer.");
      setLoading(false);
      return;
    }

    // 2. Create profile record
    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      email: form.email.trim(),
      whatsapp: form.whatsapp.trim() || null,
      role: "merchant",
    });

    if (profileError) {
      console.error("[Register] profile insert error:", profileError.message);
      // Non-blocking – profile may have been created via DB trigger
    }

    router.push("/dashboard/onboarding");
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4 py-12">
      {/* Background mesh */}
      <div
        className="pointer-events-none fixed inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 70% 40% at 70% 0%, rgba(99,102,241,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="w-full max-w-md relative">
        <div
          className="rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl p-8 shadow-2xl"
          style={{ boxShadow: "0 0 80px rgba(99,102,241,0.05)" }}
        >
          {/* Header */}
          <div className="mb-7 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 mb-4">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            </div>
            <h1
              className="text-xl font-semibold text-white tracking-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Créer votre boutique
            </h1>
            <p className="mt-1 text-sm text-white/40">
              Commencez à vendre en quelques minutes
            </p>
          </div>

          {/* Server error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <svg className="mt-0.5 shrink-0 text-red-400" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              <p className="text-sm text-red-300">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prénom" error={errors.firstName}>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={set("firstName")}
                  onBlur={blur("firstName")}
                  placeholder="Amine"
                  className={errors.firstName ? inputErrorClass : inputClass}
                />
              </Field>
              <Field label="Nom" error={errors.lastName}>
                <input
                  type="text"
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={set("lastName")}
                  onBlur={blur("lastName")}
                  placeholder="Benali"
                  className={errors.lastName ? inputErrorClass : inputClass}
                />
              </Field>
            </div>

            {/* Email */}
            <Field label="Adresse e-mail" error={errors.email}>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={set("email")}
                onBlur={blur("email")}
                placeholder="vous@exemple.com"
                className={errors.email ? inputErrorClass : inputClass}
              />
            </Field>

            {/* WhatsApp */}
            <Field label="Numéro WhatsApp (optionnel)" error={errors.whatsapp}>
              <input
                type="tel"
                autoComplete="tel"
                value={form.whatsapp}
                onChange={set("whatsapp")}
                onBlur={blur("whatsapp")}
                placeholder="+213 6 00 00 00 00"
                className={errors.whatsapp ? inputErrorClass : inputClass}
              />
            </Field>

            {/* Password */}
            <Field label="Mot de passe" error={errors.password}>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.password}
                  onChange={set("password")}
                  onBlur={blur("password")}
                  placeholder="••••••••"
                  className={(errors.password ? inputErrorClass : inputClass) + " pr-11"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? "🙈" : "👁"}
                </button>
              </div>
              {/* Strength bar */}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor:
                            i <= strength.score ? strength.color : "rgba(255,255,255,0.08)",
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-1 text-xs" style={{ color: strength.color }}>
                    {strength.label}
                  </p>
                </div>
              )}
            </Field>

            {/* Confirm password */}
            <Field label="Confirmer le mot de passe" error={errors.confirmPassword}>
              <input
                type="password"
                autoComplete="new-password"
                value={form.confirmPassword}
                onChange={set("confirmPassword")}
                onBlur={blur("confirmPassword")}
                placeholder="••••••••"
                className={errors.confirmPassword ? inputErrorClass : inputClass}
              />
            </Field>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              style={{ boxShadow: "0 0 20px rgba(99,102,241,0.25)" }}
            >
              {loading ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              ) : (
                "Créer mon compte →"
              )}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-white/35">
            Déjà inscrit ?{" "}
            <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Se connecter
            </Link>
          </p>

          <p className="mt-4 text-center text-xs text-white/20 leading-relaxed">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/terms" className="underline underline-offset-2 hover:text-white/40">
              Conditions d&apos;utilisation
            </Link>{" "}
            et notre{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-white/40">
              Politique de confidentialité
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function translateError(msg: string): string {
  if (msg.includes("User already registered"))
    return "Un compte existe déjà avec cet e-mail.";
  if (msg.includes("Password should be"))
    return "Le mot de passe doit contenir au moins 6 caractères.";
  if (msg.includes("Unable to validate email"))
    return "Adresse e-mail invalide.";
  return msg;
}
