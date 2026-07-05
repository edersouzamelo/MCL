"use client";

import { CheckCircle, AlertTriangle } from "lucide-react";
import { usePathname } from "next/navigation";

export function DemoBanner() {
  const pathname = usePathname() || "";
  
  const runtimeNotice = process.env.NEXT_PUBLIC_DATABASE_URL || process.env.DATABASE_URL
    ? undefined
    : "MODO MEMÓRIA";

  // Identifica telas que possuem integração de dados reais
  const isRealDataScreen = pathname.includes("/analises/materiais") || pathname.includes("/catmat") || pathname.includes("/atas");

  if (isRealDataScreen) {
    return (
      <div className="flex items-center justify-center gap-2 bg-emerald-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-emerald-950 border-b border-emerald-200 shadow-sm">
        <CheckCircle aria-hidden className="h-4 w-4 shrink-0 text-emerald-700" />
        <span>INTEGRADO AO COMPRAS.GOV (DADOS REAIS DA TELA ATUAL) {runtimeNotice ? `| ${runtimeNotice}` : ""}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 bg-yellow-100 px-3 py-2 text-center text-xs font-bold uppercase tracking-wide text-yellow-950 border-b border-yellow-200 shadow-sm">
      <AlertTriangle aria-hidden className="h-4 w-4 shrink-0 text-yellow-700" />
      <span>AMBIENTE DE DEMONSTRAÇÃO (DADOS SINTÉTICOS) {runtimeNotice ? `| ${runtimeNotice}` : ""}</span>
    </div>
  );
}
