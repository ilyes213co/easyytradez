"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, ArrowRight, ArrowLeft, Mail, KeyRound, Sparkles } from "lucide-react";
import EasyTradeLogo from "@/components/brand/EasyTradeLogo";
import ThreeAmbientScene from "@/components/brand/ThreeAmbientScene";
import OtpInput from "@/components/auth/OtpInput";
import { createClient } from "@/lib/supabase";

interface AuthCardProps {
  initialMode?: "login" | "register";
}

function AuthCardContent({ initialMode = "login" }: AuthCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [authMethod, setAuthMethod] = useState<"otp" | "password">("password");
  const [step, setStep] = useState<"form" | "otp" | "email_confirm_sent">("form");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreedTerms, setAgreedTerms] = useState(true);

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // Check URL error from OAuth callback
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      toast.error(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  // Reset step if mode changes
  const switchMode = (newMode: "login" | "register") => {
    setMode(newMode);
    setStep("form");
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, width: "0%", color: "transparent" };
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    const colors = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
    const widths = ["25%", "50%", "75%", "100%"];
    const idx = Math.min(score - 1, 3);
    return {
      score,
      width: widths[Math.max(0, idx)],
      color: colors[Math.max(0, idx)],
    };
  };

  const pwdStrength = getPasswordStrength(password);

  // Google OAuth handler
  const handleGoogleAuth = async () => {
    setIsGoogleLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback?next=/dashboard`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (error) {
        toast.error("Erreur Google : " + error.message);
        setIsGoogleLoading(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la connexion Google");
      setIsGoogleLoading(false);
    }
  };

  // Step 1: Send OTP to Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      toast.error("Veuillez renseigner votre adresse email.");
      return;
    }

    if (mode === "register") {
      if (!fullName.trim()) {
        toast.error("Veuillez renseigner votre nom complet.");
        return;
      }
      if (!phone.trim()) {
        toast.error("Veuillez renseigner votre numéro de téléphone.");
        return;
      }
      if (!agreedTerms) {
        toast.error("Veuillez accepter les conditions d'utilisation.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: fullName.trim() || undefined,
            phone: phone.replace(/\s+/g, "") || undefined,
          },
        },
      });

      if (error) {
        if (error.message.includes("rate limit") || error.status === 429) {
          toast.error("Trop de demandes. Veuillez patienter une minute avant de réessayer.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Code de confirmation envoyé ! Vérifiez votre boîte mail.");
      setStep("otp");
    } catch (err: any) {
      toast.error(err?.message || "Impossible d'envoyer le code de vérification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (otpCode: string) => {
    if (otpCode.length !== 6) return;
    setIsVerifyingOtp(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode,
        type: "email",
      });

      if (error) {
        toast.error("Code invalide ou expiré. Veuillez vérifier et réessayer.");
        return;
      }

      // If user provided name or phone, ensure profile table is updated
      if (data.user && (fullName.trim() || phone.trim())) {
        const cleanPhone = phone.replace(/\s+/g, "");
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName.trim() || data.user.user_metadata?.full_name || null,
          phone: cleanPhone || data.user.user_metadata?.phone || null,
          plan: "free",
        });
      }

      toast.success(
        mode === "register"
          ? "Boutique créée avec succès ! Bienvenue sur easytrade."
          : "Connexion réussie ! Bienvenue sur votre espace."
      );
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la validation du code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Password Login Handler
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez renseigner votre email et mot de passe.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Identifiants incorrects. Vérifiez votre email et mot de passe.");
        } else if (error.message.includes("Email not confirmed")) {
          toast.error("Veuillez confirmer votre email avant de vous connecter.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success("Connexion réussie ! Redirection vers votre tableau de bord...");
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la connexion.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Password Register Handler
  const handlePasswordRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !password) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    if (!agreedTerms) {
      toast.error("Veuillez accepter les conditions d'utilisation.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone: phone.replace(/\s+/g, ""),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast.error("Cet email est déjà associé à un compte. Veuillez vous connecter.");
          switchMode("login");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.user) {
        const cleanPhone = phone.replace(/\s+/g, "");
        await supabase.from("profiles").upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          phone: cleanPhone || null,
          plan: "free",
        });
      }

      if (data.session) {
        toast.success("Compte créé avec succès ! Bienvenue sur EasyTrade.");
        window.location.href = "/dashboard";
      } else {
        toast.info("Inscription enregistrée ! Veuillez confirmer votre email.");
        setStep("email_confirm_sent");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de la création du compte.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!email) {
      toast.info("Entrez d'abord votre adresse email dans le champ.");
      return;
    }
    toast.promise(
      supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      }),
      {
        loading: "Envoi du lien de réinitialisation...",
        success: "Lien envoyé ! Vérifiez votre boîte de réception.",
        error: (err) => err?.message || "Impossible d'envoyer le lien pour le moment.",
      }
    );
  };

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#06060f] text-white selection:bg-[#2540ea] selection:text-white">
      {/* 3D WebGL Background Scene */}
      <ThreeAmbientScene opacity={0.85} interactive={true} />

      {/* Atmospheric Glow Overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          background: `
            radial-gradient(ellipse 65% 55% at 50% 25%, var(--g-subtle, rgba(37, 64, 234, 0.18)) 0%, transparent 70%),
            radial-gradient(circle at bottom, rgba(6, 6, 15, 0.95) 0%, transparent 75%)
          `,
        }}
        aria-hidden="true"
      />

      {/* Top Bar */}
      <header className="relative z-10 flex items-center justify-between px-6 py-6 md:px-12">
        <EasyTradeLogo size={34} href="/" />

        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white px-4 py-2 rounded-xl transition-all duration-200 hover:-translate-x-0.5"
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid var(--border, rgba(96, 165, 250, 0.28))",
          }}
        >
          <ArrowLeft className="w-4 h-4 text-white/70" />
          <span>Accueil</span>
        </Link>
      </header>

      {/* Auth Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6">
        <div
          className="w-full max-w-[480px] rounded-[28px] p-8 md:p-10 shadow-2xl relative overflow-hidden backdrop-blur-2xl transition-all"
          style={{
            background:
              "linear-gradient(155deg, rgba(28, 44, 148, 0.35) 0%, rgba(10, 14, 38, 0.88) 100%)",
            border: "1px solid var(--border, rgba(96, 165, 250, 0.28))",
            boxShadow:
              "0 24px 60px -12px rgba(0, 0, 0, 0.8), 0 0 35px var(--g-subtle, rgba(37, 64, 234, 0.2))",
          }}
        >
          {/* Top illuminated gradient line */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{
              background:
                "linear-gradient(90deg, transparent, var(--gl, #93c5fd), var(--g, #2540ea), transparent)",
            }}
          />

          {/* Heading */}
          <div className="text-center mb-6">
            <h1
              className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2"
              style={{ fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}
            >
              {step === "otp"
                ? "Code de confirmation"
                : step === "email_confirm_sent"
                ? "Vérifiez votre boîte mail"
                : mode === "login"
                ? "Connexion"
                : "Créer une boutique"}
            </h1>
            <p className="text-sm text-white/65">
              {step === "otp"
                ? "Entrez les 6 chiffres reçus par email pour vous connecter"
                : step === "email_confirm_sent"
                ? "Un email de confirmation a été envoyé à votre adresse"
                : mode === "login"
                ? "Accédez à votre espace marchand easytrade"
                : "Rejoignez les marchands e-commerce en Algérie 🇩🇿"}
            </p>
          </div>

          {/* Segmented Tab Switch (Only in Form step) */}
          {step === "form" && (
            <div
              className="flex p-1 rounded-2xl mb-6"
              style={{
                background: "rgba(10, 14, 38, 0.7)",
                border: "1px solid var(--border, rgba(96, 165, 250, 0.28))",
              }}
            >
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  mode === "login"
                    ? "text-white shadow-lg"
                    : "text-white/60 hover:text-white"
                }`}
                style={{
                  background:
                    mode === "login"
                      ? "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)"
                      : "transparent",
                  boxShadow:
                    mode === "login"
                      ? "0 4px 16px var(--g-glow, rgba(37, 64, 234, 0.6))"
                      : "none",
                }}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
                  mode === "register"
                    ? "text-white shadow-lg"
                    : "text-white/60 hover:text-white"
                }`}
                style={{
                  background:
                    mode === "register"
                      ? "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)"
                      : "transparent",
                  boxShadow:
                    mode === "register"
                      ? "0 4px 16px var(--g-glow, rgba(37, 64, 234, 0.6))"
                      : "none",
                }}
              >
                Inscription
              </button>
            </div>
          )}

          {/* STEP 2: OTP Verification Mode */}
          {step === "otp" && (
            <OtpInput
              email={email.trim()}
              onVerify={handleVerifyOtp}
              onResend={async () => {
                const { error } = await supabase.auth.signInWithOtp({
                  email: email.trim(),
                  options: { shouldCreateUser: true },
                });
                if (error) {
                  toast.error(error.message);
                } else {
                  toast.success("Nouveau code envoyé par email !");
                }
              }}
              onBack={() => setStep("form")}
              isVerifying={isVerifyingOtp}
            />
          )}

          {/* STEP 3: Email Confirmation Sent Screen */}
          {step === "email_confirm_sent" && (
            <div className="space-y-6 text-center py-4">
              <div
                className="w-16 h-16 mx-auto rounded-full flex items-center justify-center shadow-lg"
                style={{
                  background: "rgba(37, 64, 234, 0.2)",
                  border: "1px solid var(--border, rgba(96, 165, 250, 0.4))",
                  boxShadow: "0 0 24px rgba(37, 64, 234, 0.4)",
                }}
              >
                <Mail className="w-8 h-8 text-sky-300 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white tracking-tight">
                  Vérifiez votre boîte mail
                </h3>
                <p className="text-xs text-white/70 max-w-sm mx-auto leading-relaxed">
                  Un email d&apos;activation a été envoyé à{" "}
                  <strong className="text-white font-semibold">{email.trim()}</strong>.
                  Veuillez cliquer sur le lien dans votre boîte de réception pour valider votre compte.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.04] border border-white/10 text-xs text-white/60 space-y-1 text-left">
                <p className="font-semibold text-white/80">💡 Vous n&apos;avez rien reçu ?</p>
                <p>Pensez à vérifier vos courriers indésirables (Spam) ou cliquez ci-dessous pour renvoyer le lien.</p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={async () => {
                    const { error } = await supabase.auth.resend({
                      type: "signup",
                      email: email.trim(),
                      options: {
                        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
                      },
                    });
                    if (error) {
                      toast.error(error.message);
                    } else {
                      toast.success("Lien de confirmation renvoyé avec succès !");
                    }
                  }}
                  className="w-full py-3 rounded-xl font-bold text-xs text-white/90 hover:text-white bg-white/10 hover:bg-white/15 border border-white/10 transition-all"
                >
                  Renvoyer l&apos;email de confirmation
                </button>

                <button
                  type="button"
                  onClick={() => {
                    switchMode("login");
                    setStep("form");
                  }}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white bg-accent hover:bg-accent/90 transition-all shadow-md shadow-accent/30"
                  style={{
                    background: "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)",
                  }}
                >
                  J&apos;ai confirmé mon email — Se connecter
                </button>
              </div>
            </div>
          )}

          {/* STEP 1: Main Form */}
          {step === "form" && (
            <div className="space-y-4">
              {/* Google OAuth Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={isGoogleLoading}
                className="w-full py-3.5 px-4 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-3 transition-all duration-200 hover:bg-white/10 active:scale-[0.99] disabled:opacity-50"
                style={{
                  background: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid var(--border, rgba(96, 165, 250, 0.28))",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
                }}
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.13C3.27 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.58H1.26C.46 8.17 0 9.99 0 12s.46 3.83 1.26 5.42l4.02-3.13z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.58l4.02 3.13c.95-2.83 3.6-4.96 6.72-4.96z"
                    />
                  </svg>
                )}
                <span>
                  {mode === "login"
                    ? "Continuer avec Google"
                    : "Créer ma boutique avec Google"}
                </span>
              </button>

              {/* Or Divider */}
              <div className="flex items-center gap-3 my-2">
                <span
                  className="flex-1 h-[1px]"
                  style={{ background: "var(--border, rgba(96, 165, 250, 0.28))" }}
                />
                <span className="text-xs font-medium text-white/45">
                  ou avec votre email
                </span>
                <span
                  className="flex-1 h-[1px]"
                  style={{ background: "var(--border, rgba(96, 165, 250, 0.28))" }}
                />
              </div>

              {/* OTP Flow (Default & Recommended) */}
              {authMethod === "otp" ? (
                <form onSubmit={handleSendOtp} className="space-y-3.5 text-left">
                  {mode === "register" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-white/90">
                          Nom complet du marchand
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex : Amina Benali"
                          required
                          autoComplete="name"
                          className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border focus:outline-none transition-all"
                          style={{
                            borderColor: "var(--border, rgba(96, 165, 250, 0.28))",
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-white/90">
                          Numéro de téléphone
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="05 / 06 / 07 XX XX XX"
                          required
                          autoComplete="tel"
                          className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border focus:outline-none transition-all"
                          style={{
                            borderColor: "var(--border, rgba(96, 165, 250, 0.28))",
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/90">
                      Adresse email
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre.boutique@gmail.com"
                        required
                        autoComplete="email"
                        className="w-full px-4 py-3 pl-10 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border focus:outline-none transition-all"
                        style={{
                          borderColor: "var(--border, rgba(96, 165, 250, 0.28))",
                        }}
                      />
                      <Mail className="w-4 h-4 text-white/40 absolute left-3.5 pointer-events-none" />
                    </div>
                  </div>

                  {mode === "register" && (
                    <label className="flex items-start gap-2.5 text-xs text-white/70 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        required
                        className="rounded border-white/20 accent-[#2540ea] w-4 h-4 mt-0.5"
                      />
                      <span>J&apos;accepte les conditions d&apos;utilisation d&apos;easytrade Algérie</span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)",
                      boxShadow: "0 8px 24px -4px var(--g-glow, rgba(37, 64, 234, 0.6))",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-[#93c5fd]" />
                        <span>Recevoir mon code par email</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Switch to password */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMethod("password")}
                      className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1.5 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Se connecter avec mot de passe</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* Password Flow (Alternative) */
                <form
                  onSubmit={mode === "login" ? handlePasswordLogin : handlePasswordRegister}
                  className="space-y-3.5 text-left"
                >
                  {mode === "register" && (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-white/90">
                          Nom complet du marchand
                        </label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Ex : Amina Benali"
                          required
                          autoComplete="name"
                          className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border focus:outline-none transition-all"
                          style={{
                            borderColor: "var(--border, rgba(96, 165, 250, 0.28))",
                          }}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-white/90">
                          Numéro de téléphone
                        </label>
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="05 / 06 / 07 XX XX XX"
                          required
                          autoComplete="tel"
                          className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border focus:outline-none transition-all"
                          style={{
                            borderColor: "var(--border, rgba(96, 165, 250, 0.28))",
                          }}
                        />
                      </div>
                    </>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-white/90">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre.boutique@gmail.com"
                      required
                      autoComplete="email"
                      className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border focus:outline-none transition-all"
                      style={{
                        borderColor: "var(--border, rgba(96, 165, 250, 0.28))",
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-white/90">
                        Mot de passe
                      </label>
                      {mode === "login" && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs font-semibold hover:underline"
                          style={{ color: "var(--gl, #93c5fd)" }}
                        >
                          Oublié ?
                        </button>
                      )}
                    </div>
                    <div className="relative flex items-center">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        className="w-full px-4 py-2.5 pr-11 rounded-xl text-sm text-white placeholder-white/35 bg-[#060612]/70 border focus:outline-none transition-all"
                        style={{
                          borderColor: "var(--border, rgba(96, 165, 250, 0.28))",
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 text-white/50 hover:text-white transition-colors"
                        aria-label="Afficher le mot de passe"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {mode === "register" && (
                      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden mt-1.5 flex">
                        <div
                          className="h-full transition-all duration-300 rounded-full"
                          style={{
                            width: pwdStrength.width,
                            backgroundColor: pwdStrength.color,
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {mode === "register" && (
                    <label className="flex items-start gap-2.5 text-xs text-white/70 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={agreedTerms}
                        onChange={(e) => setAgreedTerms(e.target.checked)}
                        required
                        className="rounded border-white/20 accent-[#2540ea] w-4 h-4 mt-0.5"
                      />
                      <span>J&apos;accepte les conditions d&apos;utilisation d&apos;easytrade Algérie</span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3.5 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)",
                      boxShadow: "0 8px 24px -4px var(--g-glow, rgba(37, 64, 234, 0.6))",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                    }}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <>
                        <span>{mode === "login" ? "Se connecter" : "Créer ma boutique"}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {/* Switch to OTP */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setAuthMethod("otp")}
                      className="text-xs text-white/50 hover:text-white inline-flex items-center gap-1.5 transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>
                        {mode === "login"
                          ? "Connexion rapide sans mot de passe (code email)"
                          : "Inscription rapide sans mot de passe (code email)"}
                      </span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-5 text-center text-xs text-white/50">
        © 2026 easytrade · Plateforme e-commerce conçue pour l&apos;Algérie 🇩🇿
      </footer>
    </div>
  );
}

export default function AuthCard({ initialMode = "login" }: AuthCardProps) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#06060f]" />}>
      <AuthCardContent initialMode={initialMode} />
    </Suspense>
  );
}
