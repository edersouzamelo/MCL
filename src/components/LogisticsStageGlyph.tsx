import type { ReactNode } from "react";

interface LogisticsStageGlyphProps { type: string; className?: string; }

export function LogisticsStageGlyph({ type, className = "ops-stage-icon-symbol" }: LogisticsStageGlyphProps) {
  const paths: Record<string, ReactNode> = {
    clipboard: <><path d="M10 7H7v21h18V7h-3" /><path d="M11 4h10v6H11zM11 16l3 3 6-7M11 24h10" /></>,
    credit: <><path d="M5 8h22v17H5zM5 13h22M9 20h6" /><path d="M22 18v4" /></>,
    cart: <><path d="M4 6h4l3 14h12l3-10H10M12 25h3v3h-3zM21 25h3v3h-3z" /><path d="M13 15h10" /></>,
    package: <><path d="M5 10l11-6 11 6v13l-11 6-11-6zM5 10l11 6 11-6M16 16v13" /><path d="M10 7l11 6v5" /></>,
    warehouse: <><path d="M4 13L16 5l12 8v15H4zM8 16h16M9 20h6v8M18 20h6v8" /><path d="M13 11h6" /></>,
    truck: <><path d="M3 8h15v15H3zM18 13h6l5 6v4H18zM8 23v4h4v-4M22 23v4h4v-4" /><path d="M24 14v5h5" /></>,
    wrench: <><path d="M20 5a7 7 0 0 0-8 9L4 22l6 6 8-8a7 7 0 0 0 9-8l-5 5-5-2-2-5z" /><path d="M7 23l3 3" /></>,
    return: <><path d="M11 8 5 14l6 6" /><path d="M6 14h12a9 9 0 0 1 9 9v4M18 6h9v7" /></>,
  };
  return <svg className={className} viewBox="0 0 32 32" aria-hidden="true">{paths[type] ?? paths.package}</svg>;
}
