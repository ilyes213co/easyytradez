"use client";

import { useState } from "react";
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
          setTimeout(() => window.location.reload(), 1500);
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
      setTimeout(() => window.location.reload(), 1500);
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
          className="btn-secondary gap-2"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Mettre à jour
        </button>
      ) : (
        <button
          onClick={handlePublish}
          disabled={busy}
          className="btn-primary gap-2"
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
