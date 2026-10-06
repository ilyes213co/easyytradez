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
  size = 34,
  showText = true,
  href = "/",
}: EasyTradeLogoProps) {
  const height = Math.round((size * 22) / 34);

  const content = (
    <span
      className={`inline-flex items-center gap-2.5 group cursor-pointer select-none transition-transform duration-200 hover:scale-[1.02] ${className}`}
      style={{ textDecoration: "none" }}
    >
      <svg
        className="transition-transform duration-300 ease-out group-hover:scale-105 group-hover:-translate-y-0.5"
        style={{
          width: size,
          height: height,
          filter: "drop-shadow(0 4px 12px rgba(37, 64, 234, 0.45))",
          flexShrink: 0,
        }}
        viewBox="210 310 575 370"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Logo easytrade"
      >
        <defs>
          <linearGradient id="easyBridgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
        </defs>

        {/* Left branch: stylized 'E' */}
        <path
          fill="#ffffff"
          fillRule="evenodd"
          clipRule="evenodd"
          d="
            M 270 655
            L 430 655
            L 430 594
            L 326 594
            L 404 450
            L 514 450
            L 438 335
            C 430 322 418 322 410 335
            L 236 626
            A 26 26 0 0 0 270 655
            Z
            M 374 450
            L 446 450
            L 415 390
            Z
          "
        />

        {/* Central sky/blue gradient bridge */}
        <path
          fill="url(#easyBridgeGrad)"
          d="
            M 358 572
            L 404 496
            C 416 476 432 464 456 464
            L 604 464
            L 604 516
            L 468 516
            C 452 516 438 526 430 540
            L 402 588
            Z
          "
        />

        {/* Right branch: valley and ascending 'trade' arrow */}
        <path
          fill="#ffffff"
          d="
            M 464 516
            L 544 648
            C 552 662 568 662 576 648
            L 695 475
            L 768 466
            L 742 330
            L 556 448
            L 628 445
            L 572 535
            C 565 545 555 545 548 535
            L 522 516
            Z
          "
        />
      </svg>

      {showText && (
        <span
          className="text-xl font-black tracking-tight text-white leading-none"
          style={{ fontFamily: "var(--font-heading, 'Outfit', sans-serif)" }}
        >
          easy
          <em
            style={{
              color: "var(--gl, #93c5fd)",
              fontStyle: "normal",
              textShadow: "0 0 16px var(--g-glow, rgba(37, 64, 234, 0.6))",
            }}
          >
            trade
          </em>
        </span>
      )}
    </span>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}
