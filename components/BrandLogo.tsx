import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export function BrandLogo({ className = "", size = 40 }: BrandLogoProps) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 shadow-lg shadow-indigo-950/40 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Glow de fundo */}
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/30 via-violet-600/20 to-transparent" />

      {/* Ícone Isométrico Vetorial Minimalista TechStore */}
      <svg
        width={size * 0.6}
        height={size * 0.6}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10"
      >
        <defs>
          <linearGradient id="cubeTop" x1="8" y1="5" x2="24" y2="15" gradientUnits="userSpaceOnUse">
            <stop stopColor="#818CF8" />
            <stop offset="1" stopColor="#6366F1" />
          </linearGradient>
          <linearGradient id="cubeLeft" x1="6" y1="13" x2="16" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#4F46E5" />
            <stop offset="1" stopColor="#3730A3" />
          </linearGradient>
          <linearGradient id="cubeRight" x1="16" y1="13" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6366F1" />
            <stop offset="1" stopColor="#4338CA" />
          </linearGradient>
          <linearGradient id="coreLine" x1="16" y1="11" x2="16" y2="23" gradientUnits="userSpaceOnUse">
            <stop stopColor="#C7D2FE" />
            <stop offset="1" stopColor="#818CF8" />
          </linearGradient>
        </defs>

        {/* Faceta Superior do Cubo */}
        <path
          d="M16 4L26 9.8L16 15.5L6 9.8L16 4Z"
          fill="url(#cubeTop)"
        />

        {/* Faceta Esquerda */}
        <path
          d="M6 11.2L15 16.5V27.5L6 22.2V11.2Z"
          fill="url(#cubeLeft)"
        />

        {/* Faceta Direita */}
        <path
          d="M17 16.5L26 11.2V22.2L17 27.5V16.5Z"
          fill="url(#cubeRight)"
        />

        {/* Detalhe interno de circuito / hardware */}
        <path
          d="M16 10V18M12 14.5L16 17L20 14.5"
          stroke="url(#coreLine)"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
