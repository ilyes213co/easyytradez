import React from "react";
import Link from "next/link";

interface EasyTradeLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  href?: string;
}

export default function EasyTradeLogo({
  className = "",
  size = 32,
  showText = true,
  href = "/",
}: EasyTradeLogoProps) {
  const content = (
    <span
      className={`inline-flex items-center gap-2.5 group cursor-pointer select-none transition-transform duration-200 hover:scale-[1.02] ${className}`}
      style={{ textDecoration: "none" }}
    >
      <svg
        className="transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-translate-y-0.5"
        style={{
          width: size,
          height: size,
          filter: "drop-shadow(0 4px 14px rgba(37, 64, 234, 0.4))",
          flexShrink: 0,
        }}
        viewBox="0 0 36 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Logo EasyTradez"
      >
        <defs>
          <linearGradient id="ezBadgeBg" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1e1b4b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#090d28" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="ezBorderGrad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#2540ea" />
          </linearGradient>
          <linearGradient id="ezArrowCyan" x1="10" y1="8" x2="28" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="ezArrowBlue" x1="8" y1="16" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
        </defs>

        {/* Squircle Badge Frame */}
        <rect
          x="1"
          y="1"
          width="34"
          height="34"
          rx="10"
          fill="url(#ezBadgeBg)"
          stroke="url(#ezBorderGrad)"
          strokeWidth="1.6"
        />

        {/* Ambient Inner Glow */}
        <rect
          x="2.5"
          y="2.5"
          width="31"
          height="31"
          rx="8.5"
          fill="rgba(56, 189, 248, 0.08)"
        />

        {/* Dynamic Growth / Trade Vector (Interlocking "E" & "Z" Chevrons) */}
        {/* Top-Right Ascending Arrow */}
        <path
          d="M19 9.5H26.5V17M26 10L14.5 21.5"
          stroke="url(#ezArrowCyan)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Bottom-Left Trade Anchor forming the "Z" loop */}
        <path
          d="M17 26.5H9.5V19M10 26L21.5 14.5"
          stroke="url(#ezArrowBlue)"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Central Core Power Node */}
        <circle cx="18" cy="18" r="2.2" fill="#ffffff" />
        <circle cx="18" cy="18" r="4.2" stroke="#38bdf8" strokeWidth="0.8" opacity="0.6" />
      </svg>

      {showText && (
        <span
          className="text-xl font-black tracking-tight text-slate-900 dark:text-white leading-none transition-colors flex items-center"
          style={{ fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}
        >
          <span>Easy</span>
          <span
            className="text-accent dark:text-[#60a5fa] ml-0.5"
            style={{
              textShadow: "0 0 16px rgba(37, 64, 234, 0.4)",
            }}
          >
            Tradez
          </span>
        </span>
      )}
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
