"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { BrandLogo } from "./BrandLogo";
import type { SourceSystemCatalogEntry } from "@/modules/connectors/catalog";

interface SystemStatusIndicatorProps {
  systems: SourceSystemCatalogEntry[];
}

function SystemStatusItem({ system }: { system: SourceSystemCatalogEntry }) {
  const [showTooltip, setShowTooltip] = useState(false);

  let circleColorClass = "border-zinc-700 bg-zinc-900/60";
  let badgeColorClass = "bg-zinc-500";
  let statusText = "Mapeado";
  let statusColorClass = "text-zinc-400";
  
  if (system.status === "FALHA") {
    circleColorClass = "border-rose-500/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]";
    badgeColorClass = "bg-rose-500";
    statusText = "Falha";
    statusColorClass = "text-rose-400";
  } else if (system.nature === "SINTETICA_DEMONSTRATIVA" || system.maturity === "DEMONSTRATIVO") {
    circleColorClass = "border-indigo-500/50 shadow-[0_0_8px_rgba(99,102,241,0.2)]";
    badgeColorClass = "bg-indigo-500";
    statusText = "Simulador / Demo";
    statusColorClass = "text-indigo-400";
  } else if (system.status === "SAUDAVEL" && (system.maturity === "INTEGRADO_REAL" || system.maturity === "INTEGRADO_PARCIAL")) {
    circleColorClass = "border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)]";
    badgeColorClass = "bg-emerald-500";
    statusText = "Conectado";
    statusColorClass = "text-emerald-400";
  } else if (
    system.maturity === "PLANEJADO" ||
    system.status === "PENDENTE" ||
    system.status === "NAO_CONFIGURADO" ||
    system.status === "ATRASADO"
  ) {
    circleColorClass = "border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]";
    badgeColorClass = "bg-amber-500";
    statusText = "Pendente";
    statusColorClass = "text-amber-400";
  } else if (system.status === "NAO_INTEGRADO" || system.integrationMethod === "NAO_INTEGRADO") {
    circleColorClass = "border-zinc-800 bg-zinc-950/40 opacity-60";
    badgeColorClass = "bg-zinc-650";
    statusText = "Sem Integração";
    statusColorClass = "text-zinc-400";
  }

  return (
    <div 
      className="relative flex items-center justify-center cursor-help"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Mini Logo Container */}
      <div 
        className={`
          relative flex items-center justify-center w-7 h-7 rounded-full 
          bg-zinc-950/80 backdrop-blur-sm border transition-all duration-300
          ${circleColorClass}
        `}
      >
        {/* Mini MCL logo inside */}
        <BrandLogo 
          tone="light" 
          className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity" 
        />

        {/* Indicator Badge at corner */}
        {statusText === "Conectado" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center border border-zinc-950 text-white animate-scaleIn">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        )}
        {statusText === "Falha" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center border border-zinc-950 text-white animate-scaleIn">
            <X className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        )}
        {statusText === "Pendente" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2 w-2 rounded-full bg-amber-500 border border-zinc-950" />
        )}
        {statusText === "Simulador / Demo" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-2 w-2 rounded-full bg-indigo-500 border border-zinc-950" />
        )}
      </div>

      {/* Glassmorphic Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center animate-fadeIn pointer-events-none">
          <div className="bg-zinc-950/95 border border-zinc-805 backdrop-blur-md text-white text-[11px] rounded-lg py-2 px-3 shadow-2xl min-w-[150px] text-center flex flex-col gap-1">
            <span className="font-bold text-zinc-200 border-b border-zinc-800 pb-1">{system.name}</span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${badgeColorClass}`} />
              <span className={`${statusColorClass} font-semibold`}>{statusText}</span>
            </div>
            <div className="text-[9px] text-zinc-400 flex flex-col gap-0.5 mt-1 text-left">
              <div><strong>Maturidade:</strong> {system.maturity}</div>
              <div><strong>Método:</strong> {system.integrationMethod}</div>
              {(system.lastMessage || system.observation) && (
                <div className="max-w-[140px] text-[8px] text-zinc-550 leading-tight mt-0.5 border-t border-zinc-800/40 pt-1">
                  <strong>Nota:</strong> {system.lastMessage || system.observation}
                </div>
              )}
            </div>
          </div>
          {/* Tooltip Arrow */}
          <div className="w-2 h-2 bg-zinc-950 border-r border-b border-zinc-800 transform rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}

export function SystemStatusIndicator({ systems }: SystemStatusIndicatorProps) {
  if (systems.length === 0) {
    return (
      <div className="text-[10px] text-zinc-500 italic mt-3 mb-1">
        Nenhuma fonte mapeada
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-3 mb-1">
      {systems.map((system) => (
        <SystemStatusItem key={system.id} system={system} />
      ))}
    </div>
  );
}
