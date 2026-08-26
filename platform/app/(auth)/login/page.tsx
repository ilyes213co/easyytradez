"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Store } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ─── Validation schema ───────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Minimum 6 caractères"),
});

type LoginForm = z.infer<typeof loginSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema as any) });

  // ─── Email / password login ────────────────────────────────────────────

  const onSubmit = async (values: LoginForm) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        toast.error("Email ou mot de passe incorrect");
      } else if (error.message.includes("Email not confirmed")) {
        toast.error("Veuillez confirmer votre email d'abord");
      } else {
        toast.error(error.message);
      }
      return;
    }

    toast.success("Connexion réussie !");
    router.push("/dashboard");
    router.refresh();
  };

  // ─── Google OAuth ───────────────────────────────────────────────────────

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) {
      toast.error("Erreur Google : " + error.message);
      setIsGoogleLoading(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <Store className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Connexion</h1>
          <p className="mt-1 text-sm text-gray-500">
            Accédez à votre tableau de bord marchand
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          {/* Google button */}
          <button
            onClick={handleGoogleLogin}
            disabled={isGoogleLoading}
            className="btn-secondary mb-6 w-full"
          >
            {isGoogleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continuer avec Google
          </button>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-100" />
            </div>
            <div className="relative flex justify-center text-xs text-gray-400">
              <span className="bg-white px-3">ou avec votre email</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                className={cn("input-base", errors.email && "border-red-400 focus:border-red-400 focus:ring-red-400/20")}
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="label" htmlFor="password">Mot de passe</label>
                <Link href="/forgot-password" className="text-xs text-primary-600 hover:underline">
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className={cn("input-base pr-10", errors.password && "border-red-400")}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-2">
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Se connecter
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-medium text-primary-600 hover:underline">
            Créer un compte gratuitement
          </Link>
        </p>
      </div>
    </div>
  );
}
