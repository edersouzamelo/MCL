"use client";

import { AnimatedPercent } from "@/components/MonitorAnimatedValue";

/** SVG preserves the graphic in both monitor rendering and correction PPT export. */
export function MonitorBudgetDonut({ value, ccol, label }: { value: number; ccol: boolean; label: string }) {
  const bounded = Math.max(0, Math.min(100, value));
  return <div className="mcl-budget-ring">
    <svg viewBox="0 0 120 120" role="img" aria-label={`${label}: ${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`}>
      <circle cx="60" cy="60" r="48" fill="none" stroke={ccol ? "#e2e8f0" : "#1e293b"} strokeWidth="16" />
      <circle cx="60" cy="60" r="48" fill="none" stroke={ccol ? "#075985" : "#38bdf8"} strokeWidth="16" pathLength="100" strokeDasharray={`${bounded} ${100 - bounded}`} transform="rotate(-90 60 60)" />
    </svg>
    <span><AnimatedPercent value={value} /></span>
  </div>;
}
