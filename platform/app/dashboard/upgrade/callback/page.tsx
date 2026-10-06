"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Home,
} from "lucide-react";
import { api } from "@/lib/api";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const invoiceId = searchParams.get("invoice_id") || searchParams.get("id");
  const transactionId = searchParams.get("transaction_id");
  const isSimulated = searchParams.get("simulated") === "true";

  const [status, setStatus] = useState<"loading" | "success" | "pending" | "failed">("loading");
  const [resultData, setResultData] = useState<{
    plan?: string;
    expires_at?: string;
    message?: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const verifyPayment = async () => {
    if (!invoiceId) {
      setStatus("failed");
      setErrorMessage("Identifiant de facture absent dans l'URL.");
      return;
    }

    try {
      setStatus("loading");
      const res = await api.get("/api/payment/verify", {
        params: {
          invoice_id: invoiceId,
          transaction_id: transactionId || undefined,
        },
      });

      if (res.data?.success && res.data?.is_paid) {
        setStatus("success");
        setResultData({
          plan: res.data.plan,
          expires_at: res.data.expires_at,
          message: res.data.message,
        });
      } else {
        setStatus("pending");
        setResultData({
          plan: res.data?.plan,
          message: res.data?.message || "Le paiement est en cours de validation par votre banque.",
        });
      }
    } catch (err: any) {
      console.error("Erreur vérification paiement:", err);
      const detail = err.response?.data?.detail || err.message || "Erreur lors de la vérification du paiement";
      setStatus("failed");
      setErrorMessage(detail);
    }
  };

  useEffect(() => {
    verifyPayment();
  }, [invoiceId]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full rounded-3xl p-8 bg-white dark:bg-[#0c0d1c] border border-slate-200 dark:border-white/[0.08] shadow-2xl text-center space-y-6">
        {/* État : Chargement */}
        {status === "loading" && (
          <div className="space-y-4 py-8">
            <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
              <ShieldCheck className="w-7 h-7 text-accent" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Vérification du paiement...
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Communication avec le serveur BaridiMob / SATIM en cours. Veuillez patienter un instant.
              </p>
            </div>
          </div>
        )}

        {/* État : Succès */}
        {status === "success" && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="space-y-6 py-4"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Paiement confirmé</span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                Félicitations !
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Votre abonnement <strong className="uppercase text-accent dark:text-sky">{resultData?.plan || "Pro"}</strong> est désormais actif sur votre compte.
              </p>
            </div>

            {isSimulated && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-700 dark:text-amber-300">
                Mode simulation Sandbox : transaction confirmée localement pour les tests.
              </div>
            )}

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.05] text-xs space-y-2 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Réf. Facture :</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{invoiceId}</span>
              </div>
              {resultData?.expires_at && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Valable jusqu&apos;au :</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {new Date(resultData.expires_at).toLocaleDateString("fr-DZ")}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/dashboard"
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-accent hover:bg-accent/90 text-white flex items-center justify-center gap-2 shadow-lg shadow-accent/25 transition-all"
              >
                <span>Accéder à mon tableau de bord</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/dashboard/upgrade"
                className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors block"
              >
                Voir les détails de l&apos;abonnement
              </Link>
            </div>
          </motion.div>
        )}

        {/* État : En attente */}
        {status === "pending" && (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Clock className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Paiement en attente
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {resultData?.message || "Votre paiement est en cours de traitement par le réseau bancaire SATIM. La confirmation peut prendre quelques minutes."}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={verifyPayment}
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-accent hover:bg-accent/90 text-white flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Re-vérifier maintenant</span>
              </button>

              <Link
                href="/dashboard"
                className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors block"
              >
                Retourner au tableau de bord
              </Link>
            </div>
          </div>
        )}

        {/* État : Échec */}
        {status === "failed" && (
          <div className="space-y-6 py-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Échec ou annulation
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {errorMessage || "La transaction n'a pas pu être validée par BaridiMob / SATIM. Aucun montant n'a été débité."}
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                href="/dashboard/upgrade"
                className="w-full py-3 px-4 rounded-xl font-semibold text-xs sm:text-sm bg-accent hover:bg-accent/90 text-white flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Réessayer le paiement</span>
              </Link>

              <Link
                href="/dashboard"
                className="w-full py-2.5 px-4 rounded-xl font-medium text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors block"
              >
                Retourner à l&apos;accueil
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UpgradeCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
