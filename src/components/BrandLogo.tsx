import Image from "next/image";
import { clsx } from "clsx";

export const MCL_LOGO_SRC = "/icons/mcl-logo.png?v=3";
export const MCL_LOGO_LIGHT_SRC = "/icons/mcl-logo-light.png?v=3";

export function BrandLogo({
  className,
  priority = false,
  tone = "green",
  sizes = "(max-width: 768px) 72px, 120px",
}: {
  className?: string;
  priority?: boolean;
  tone?: "green" | "light" | "sky" | "blue";
  sizes?: string;
}) {
  const isSky = tone === "sky" || tone === "blue";
  return (
    <Image
      src={tone === "light" || isSky ? MCL_LOGO_LIGHT_SRC : MCL_LOGO_SRC}
      alt="MCL"
      width={961}
      height={1152}
      priority={priority}
      unoptimized
      className={clsx(
        "object-contain transition-all",
        isSky && "drop-shadow-[0_0_12px_rgba(56,189,248,0.35)] [filter:invert(58%)_sepia(84%)_saturate(2421%)_hue-rotate(170deg)_brightness(97%)_contrast(95%)]",
        className
      )}
      sizes={sizes}
    />
  );
}

/**
 * Logotipo Isométrico Vetorial MCL estilizado para ícones e headers
 */
export function MclVectorLogo({
  className = "h-6 w-6 text-sky-500",
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 28 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={clsx("shrink-0", className)}
    >
      {/* Faces do Cubo Isométrico */}
      <path
        d="M14 2L26 8.9V23.1L14 30L2 23.1V8.9L14 2Z"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path
        d="M14 16V30M14 16L26 8.9M14 16L2 8.9"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      {/* Detalhes geométricos internos das faces */}
      <path
        d="M8 5.5L20 12.4M8 19.5L14 23M20 19.5L14 23"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeOpacity="0.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
