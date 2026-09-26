"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Rocket, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { deployApi } from "@/lib/api";

interface Props {
  storeId: string;
  currentStatus: string;
}

type Step = "idle" | "generating" | "deploying" | "done" | "error";

const STEP_MESSAGES: Record<Step, string> = {
  idle: "",
  generating: "L'IA génère votre boutique...",
  deploying: "Publication sur Internet...",
  done: "Boutique en ligne !",
  error: "Une erreur est survenue",
};

export default function PublishButton({ storeId, currentStatus }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("idle");
  const isPublished = currentStatus === "published";

  const handlePublish = async () => {
    setStep("generating");
    try {
      const { job_id } = await deployApi.deploy(storeId);

      setStep("deploying");

      // Poll for completion
      const poll = async (): Promise<void> => {
        await new Promise((r) => setTimeout(r, 3000));
        const status = await deployApi.status(job_id);

        if (status.status === "ready") {
          setStep("done");
          toast.success(`Boutique en ligne ! ${status.url}`);
          queryClient.invalidateQueries({ queryKey: ["store", storeId] });
          queryClient.invalidateQueries({ queryKey: ["stores"] });
          router.refresh();
          setTimeout(() => setStep("idle"), 2500);
        } else if (status.status === "error") {
          setStep("error");
          toast.error(status.error ?? "Erreur de déploiement");
        } else {
          return poll();
        }
      };

      await poll();
    } catch {
      setStep("error");
      toast.error("Impossible de lancer le déploiement");
    }
  };

  const handleRedeploy = async () => {
    setStep("deploying");
    try {
      await deployApi.redeploy(storeId);
      setStep("done");
      toast.success("Boutique mise à jour !");
      queryClient.invalidateQueries({ queryKey: ["store", storeId] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
      router.refresh();
      setTimeout(() => setStep("idle"), 2500);
    } catch {
      setStep("error");
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const busy = step === "generating" || step === "deploying";

  return (
    <div className="flex flex-col gap-1">
      {isPublished ? (
        <button
          onClick={handleRedeploy}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-blue-400/30 bg-blue-950/40 hover:bg-blue-900/40 px-4 py-2.5 text-xs sm:text-sm font-semibold text-blue-200 transition-all duration-200 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Mettre à jour
        </button>
      ) : (
        <button
          onClick={handlePublish}
          disabled={busy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-900/40 border border-white/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
          Publier la boutique
        </button>
      )}
      {busy && (
        <p className="text-center text-xs text-gray-400 animate-pulse">
          {STEP_MESSAGES[step]}
        </p>
      )}
    </div>
  );
}
