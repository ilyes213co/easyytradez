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

// ─── Validation ──────────────────────────────────────────────────────────────

const registerSchema = z
  .object({
    full_name: z.string().min(2, "Minimum 2 caractères").max(60),
    email: z.string().email("Email invalide"),
    phone: z
      .string()
      .regex(/^(\+213|0)(5|6|7)\d{8}$/, "Numéro algérien invalide (ex: 06 12 34 56 78)"),
    password: z.string().min(8, "Minimum 8 caractères"),
    confirm_password: z.string(),
  })
  .refine((d) => d.password === d.confirm_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_password"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

// ─── Component ───────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();
  const supabase = createClient();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema as any) });

  const onSubmit = async (values: RegisterForm) => {
    // 1. Create auth user
    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { full_name: values.full_name },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      if (error.message.includes("already registered")) {
        toast.error("Cet email est déjà utilisé. Connectez-vous.");
      } else {
        toast.error(error.message);
      }
      return;
    }

    // 2. Insert profile row
    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: values.full_name,
        phone: values.phone.replace(/\s/g, ""),
        plan: "free",
      });

      if (profileError) {
        console.error("Profile insert error:", profileError);
      }
    }

    toast.success("Compte créé ! Vérifiez votre email pour confirmer votre inscription.");
    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <Store className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Créer un compte</h1>
          <p className="mt-1 text-sm text-gray-500">
            Gratuit — votre boutique en ligne en 5 minutes
          </p>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Full name */}
            <div>
              <label className="label">Nom complet</label>
              <input
                type="text"
                placeholder="Ahmed Benali"
                autoComplete="name"
                className={cn("input-base", errors.full_name && "border-red-400")}
                {...register("full_name")}
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                placeholder="vous@exemple.com"
                autoComplete="email"
                className={cn("input-base", errors.email && "border-red-400")}
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="label">Numéro WhatsApp</label>
              <div className="flex gap-2">
                <span className="input-base w-20 cursor-not-allowed bg-gray-50 text-center text-gray-500">+213</span>
                <input
                  type="tel"
                  placeholder="06 12 34 56 78"
                  autoComplete="tel"
                  className={cn("input-base flex-1", errors.phone && "border-red-400")}
                  {...register("phone")}
                />
              </div>
              {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>}
              <p className="mt-1 text-xs text-gray-400">Utilisé pour recevoir les commandes WhatsApp</p>
            </div>

            {/* Password */}
            <div>
              <label className="label">Mot de passe</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 8 caractères"
                  autoComplete="new-password"
                  className={cn("input-base pr-10", errors.password && "border-red-400")}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
            </div>

            {/* Confirm password */}
            <div>
              <label className="label">Confirmer le mot de passe</label>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="new-password"
                className={cn("input-base", errors.confirm_password && "border-red-400")}
                {...register("confirm_password")}
              />
              {errors.confirm_password && <p className="mt-1 text-xs text-red-500">{errors.confirm_password.message}</p>}
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary mt-2 w-full">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer mon compte gratuitement
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-gray-400">
            En créant un compte, vous acceptez nos{" "}
            <Link href="/terms" className="underline">Conditions d&apos;utilisation</Link>
          </p>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-primary-600 hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
