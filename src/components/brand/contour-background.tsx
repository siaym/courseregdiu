import * as React from "react";

export function ContourBackground() {
  return (
    <div
      className="pointer-events-none absolute top-0 right-0 w-full max-w-4xl h-[420px] overflow-hidden -z-10 select-none opacity-40 sm:opacity-50"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full text-slate-700/30"
        viewBox="0 0 800 450"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="curveGlow" x1="800" y1="0" x2="200" y2="400" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="0.5" stopColor="#1e3a8a" stopOpacity="0.15" />
            <stop offset="1" stopColor="#0b0f19" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Ambient Radial Glow */}
        <circle cx="750" cy="50" r="300" fill="url(#curveGlow)" filter="blur(60px)" />

        {/* Contour Wave Arcs */}
        <path
          d="M850 -50 C650 30, 480 140, 420 320 C380 440, 360 480, 340 520"
          stroke="#334155"
          strokeWidth="1.2"
          strokeOpacity="0.4"
          fill="none"
        />
        <path
          d="M870 20 C680 110, 520 220, 470 380 C440 480, 420 510, 400 550"
          stroke="#475569"
          strokeWidth="1"
          strokeOpacity="0.35"
          fill="none"
        />
        <path
          d="M890 90 C720 180, 570 290, 520 440"
          stroke="#38bdf8"
          strokeWidth="1"
          strokeOpacity="0.2"
          fill="none"
        />
        <path
          d="M910 160 C760 250, 620 360, 580 490"
          stroke="#1e293b"
          strokeWidth="1"
          strokeOpacity="0.5"
          fill="none"
        />
        <path
          d="M830 -110 C610 -30, 440 90, 370 270 C330 380, 310 430, 290 480"
          stroke="#1e293b"
          strokeWidth="1.5"
          strokeOpacity="0.4"
          fill="none"
        />
      </svg>
    </div>
  );
}
