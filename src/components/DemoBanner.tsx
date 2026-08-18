"use client";

import { CheckCircle, Info } from "lucide-react";
import { usePathname } from "next/navigation";

export function DemoBanner() {
  const pathname = usePathname() || "";

  if (pathname.includes("/creditos")) {
    return (
      <div className="flex items-center justify-center gap-2 bg-emerald-500/10 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-emerald-400 border-b border-emerald-500/20 shadow-sm backdrop-blur-md">
        <CheckCircle aria-hidden className="h-4 w-4 shrink-0 text-emerald-400" />
        <span>CONECTOR TESOURO GERENCIAL · DADOS DA ESTRUTURA DO FORTE LOGÍSTICO (UGs 160136, 160142 e 160513)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-zinc-900 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-zinc-300 border-b border-zinc-800 shadow-sm">
      <Info aria-hidden className="h-4 w-4 shrink-0 text-emerald-400" />
      <span>SISTEMA DE MIGRANÇA DE DADOS LOGÍSTICOS · FORTE LOGÍSTICO (MCL 2026)</span>
    </div>
  );
}
