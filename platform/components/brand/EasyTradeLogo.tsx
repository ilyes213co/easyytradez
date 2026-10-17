import React from "react";
import Link from "next/link";
import Image from "next/image";

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
      <div
        className="relative flex items-center justify-center shrink-0 transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-translate-y-0.5"
        style={{
          width: size,
          height: size,
          filter: "drop-shadow(0 4px 14px rgba(37, 64, 234, 0.35))",
        }}
      >
        <Image
          src="/brand/easytradez-icon-tight.png"
          alt="EasyTradez Logo"
          width={Math.round(size * 2)}
          height={Math.round(size * 2)}
          className="w-full h-full object-contain block dark:hidden"
          priority
        />
        <Image
          src="/brand/easytradez-icon-tight-white.png"
          alt="EasyTradez Logo"
          width={Math.round(size * 2)}
          height={Math.round(size * 2)}
          className="w-full h-full object-contain hidden dark:block"
          priority
        />
      </div>

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
