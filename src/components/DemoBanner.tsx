"use client";

import { CheckCircle, AlertTriangle } from "lucide-react";
import { usePathname } from "next/navigation";

export function DemoBanner() {
  const pathname = usePathname() || "";
  
  const runtimeNotice = process.env.NEXT_PUBLIC_DATABASE_URL || process.env.DATABASE_URL
    ? undefined
    : "MODO MEMÓRIA";

  // Identifica telas que possuem integração de dados reais do SIAFI / Tesouro Gerencial ou Compras.gov
  const isRealDataScreen =
    pathname.includes("/analises/materiais") ||
    pathname.includes("/catmat") ||
    pathname.includes("/atas") ||
    pathname.includes("/creditos");

  if (isRealDataScreen) {
    return (
      <div className="flex items-center justify-center gap-2 bg-emerald-500/10 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-emerald-400 border-b border-emerald-500/20 shadow-sm backdrop-blur-md">
        <CheckCircle aria-hidden className="h-4 w-4 shrink-0 text-emerald-400" />
        <span>INTEGRADO AO SIAFI / TESOURO GERENCIAL (DADOS REAIS: UGs 160136, 160142 e 160513)</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-yellow-100 dark:bg-yellow-950/40 px-3 py-1.5 text-center text-xs font-bold uppercase tracking-wide text-yellow-950 dark:text-yellow-400 border-b border-yellow-200 dark:border-yellow-900/50 shadow-sm">
      <AlertTriangle aria-hidden className="h-4 w-4 shrink-0 text-yellow-700 dark:text-yellow-500" />
      <span>AMBIENTE DE DEMONSTRAÇÃO (DADOS SINTÉTICOS) {runtimeNotice ? `| ${runtimeNotice}` : ""}</span>
    </div>
  );
}
