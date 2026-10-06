"use client";

import React, { useRef, useState, useEffect } from "react";
import { Loader2, ArrowLeft, RefreshCw, CheckCircle2 } from "lucide-react";

interface OtpInputProps {
  email: string;
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  onBack: () => void;
  isVerifying: boolean;
}

export default function OtpInput({
  email,
  onVerify,
  onResend,
  onBack,
  isVerifying,
}: OtpInputProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleChange = (index: number, value: string) => {
    // Only allow single numeric character
    const sanitized = value.replace(/\D/g, "");
    if (!sanitized) {
      const newDigits = [...digits];
      newDigits[index] = "";
      setDigits(newDigits);
      return;
    }

    const char = sanitized.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    // Auto advance to next slot
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify if all 6 digits are filled
    const fullCode = newDigits.join("");
    if (fullCode.length === 6 && !newDigits.includes("")) {
      onVerify(fullCode);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || "";
    }
    setDigits(newDigits);

    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();

    if (pasted.length === 6) {
      onVerify(pasted);
    }
  };

  const handleResendClick = async () => {
    if (resendCooldown > 0 || isResending) return;
    setIsResending(true);
    try {
      await onResend();
      setResendCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

  const isComplete = digits.every((d) => d.length === 1);

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Email Recap with Edit action */}
      <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-left">
        <div className="overflow-hidden pr-2">
          <p className="text-xs text-white/50 font-medium">Code envoyé à :</p>
          <p className="text-sm font-semibold text-white truncate">{email}</p>
        </div>
        <button
          type="button"
          onClick={onBack}
          disabled={isVerifying}
          className="text-xs font-semibold px-2.5 py-1.5 rounded-lg text-white/70 hover:text-white bg-white/5 hover:bg-white/10 transition-colors shrink-0"
        >
          Modifier
        </button>
      </div>

      {/* 6 Digit Input Slots */}
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            disabled={isVerifying}
            className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-black rounded-xl text-white bg-[#060612]/80 border transition-all duration-150 focus:outline-none focus:scale-105"
            style={{
              borderColor: digit
                ? "var(--gl, #93c5fd)"
                : "var(--border, rgba(96, 165, 250, 0.28))",
              boxShadow: digit
                ? "0 0 16px var(--g-subtle, rgba(37, 64, 234, 0.35))"
                : "none",
            }}
          />
        ))}
      </div>

      {/* Manual Validate Button */}
      <button
        type="button"
        onClick={() => onVerify(digits.join(""))}
        disabled={!isComplete || isVerifying}
        className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-xl transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:pointer-events-none"
        style={{
          background:
            "linear-gradient(135deg, var(--g, #2540ea) 0%, var(--gd, #1a2ca3) 100%)",
          boxShadow: "0 8px 24px -4px var(--g-glow, rgba(37, 64, 234, 0.6))",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        {isVerifying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin text-white" />
            <span>Vérification en cours...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirmer et accéder</span>
          </>
        )}
      </button>

      {/* Resend and Help row */}
      <div className="flex items-center justify-between text-xs text-white/60 pt-1">
        <button
          type="button"
          onClick={onBack}
          disabled={isVerifying}
          className="inline-flex items-center gap-1.5 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour</span>
        </button>

        <button
          type="button"
          onClick={handleResendClick}
          disabled={resendCooldown > 0 || isResending || isVerifying}
          className={`inline-flex items-center gap-1.5 transition-colors ${
            resendCooldown > 0
              ? "text-white/40 cursor-not-allowed"
              : "text-[#93c5fd] hover:text-white font-semibold"
          }`}
        >
          {isResending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className={`w-3.5 h-3.5 ${resendCooldown === 0 ? "hover:rotate-180 transition-transform duration-300" : ""}`} />
          )}
          <span>
            {resendCooldown > 0
              ? `Renvoyer (${resendCooldown}s)`
              : "Renvoyer le code"}
          </span>
        </button>
      </div>
    </div>
  );
}
