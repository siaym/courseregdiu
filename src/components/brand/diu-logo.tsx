import * as React from "react";

export interface DiuLogoProps {
  className?: string;
  showText?: boolean;
}

export function DiuLogo({ className = "h-9 w-9", showText = true }: DiuLogoProps) {
  return (
    <div className="flex items-center gap-3">
      {/* Authentic DIU Crest Emblem SVG */}
      <svg
        className={className}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Daffodil International University Crest"
      >
        {/* Shield base with subtle gradient/shadow */}
        <defs>
          <linearGradient id="diuShieldGrad" x1="24" y1="2" x2="24" y2="46" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0284c7" />
            <stop offset="0.5" stopColor="#0369a1" />
            <stop offset="1" stopColor="#075985" />
          </linearGradient>
          <linearGradient id="diuGoldGrad" x1="12" y1="12" x2="36" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#f59e0b" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="diuGreenGrad" x1="16" y1="20" x2="32" y2="36" gradientUnits="userSpaceOnUse">
            <stop stopColor="#10b981" />
            <stop offset="1" stopColor="#059669" />
          </linearGradient>
        </defs>

        {/* Outer Shield Path */}
        <path
          d="M24 3L8 9V22C8 32.5 14.8 42.1 24 45C33.2 42.1 40 32.5 40 22V9L24 3Z"
          fill="url(#diuShieldGrad)"
          stroke="#38bdf8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />

        {/* Gold Inner Shield Border */}
        <path
          d="M24 6L11 11V22C11 30.5 16.5 38.6 24 41.5C31.5 38.6 37 30.5 37 22V11L24 6Z"
          stroke="url(#diuGoldGrad)"
          strokeWidth="1.2"
          fill="#0c192c"
        />

        {/* University Open Book Symbol */}
        <path
          d="M24 16C21.5 14.5 17.5 14.8 15 15.5V26.5C17.5 25.8 21.5 25.5 24 27C26.5 25.5 30.5 25.8 33 26.5V15.5C30.5 14.8 26.5 14.5 24 16Z"
          fill="#ffffff"
          opacity="0.95"
        />
        <path
          d="M24 16V27"
          stroke="#0284c7"
          strokeWidth="1"
          strokeLinecap="round"
        />

        {/* Emerald Laurel / Ribbon Arc */}
        <path
          d="M17 31C19 33.5 21.5 34.5 24 34.5C26.5 34.5 29 33.5 31 31"
          stroke="url(#diuGreenGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Academic Star of Excellence */}
        <circle cx="24" cy="11.5" r="1.5" fill="#f59e0b" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-white text-[13px] tracking-tight">
            Daffodil
          </span>
          <span className="text-[#8e9db2] text-[10px] tracking-tight font-medium">
            International University
          </span>
        </div>
      )}
    </div>
  );
}
