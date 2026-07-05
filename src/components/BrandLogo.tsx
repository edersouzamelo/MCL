import Image from "next/image";
import { clsx } from "clsx";

export const MCL_LOGO_SRC = "/icons/mcl-logo.png";
export const MCL_LOGO_LIGHT_SRC = "/icons/mcl-logo-light.png";

export function BrandLogo({
  className,
  priority = false,
  tone = "green",
  sizes = "(max-width: 768px) 72px, 120px",
}: {
  className?: string;
  priority?: boolean;
  tone?: "green" | "light";
  sizes?: string;
}) {
  return (
    <Image
      src={tone === "light" ? MCL_LOGO_LIGHT_SRC : MCL_LOGO_SRC}
      alt=""
      width={961}
      height={1152}
      priority={priority}
      className={clsx("object-contain", className)}
      sizes={sizes}
    />
  );
}
