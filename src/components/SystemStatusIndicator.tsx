"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { BrandLogo } from "./BrandLogo";

interface SystemStatusIndicatorProps {
  systems: string[];
}

function SystemStatusItem({ name }: { name: string }) {
  const [status, setStatus] = useState<"loading" | "online" | "offline">("loading");
  const [latency, setLatency] = useState<number | undefined>(undefined);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Generate a random duration for the simulated check (between 1200ms and 2800ms)
    const delay = 1200 + Math.random() * 1600;
    
    const timer = setTimeout(() => {
      // Determine simulated outcome
      // Some systems are more unstable for demonstration purposes
      const failureRate = name === "Correios" || name === "SISCOFIS" ? 0.3 : 0.1;
      const isOnline = Math.random() > failureRate;

      if (isOnline) {
        setStatus("online");
        setLatency(Math.round(45 + Math.random() * 180));
      } else {
        setStatus("offline");
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [name]);

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
          ${status === "loading" && "border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse"}
          ${status === "online" && "border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.25)] hover:scale-105"}
          ${status === "offline" && "border-rose-500/50 shadow-[0_0_10px_rgba(239,68,68,0.25)] hover:scale-105"}
        `}
      >
        {/* Ring animations for loading */}
        {status === "loading" && (
          <div className="absolute inset-0 rounded-full border-t-2 border-l-2 border-amber-500 animate-spin" />
        )}

        {/* Mini MCL logo inside */}
        <BrandLogo 
          tone="light" 
          className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity" 
        />

        {/* Indicator Badge at corner */}
        {status === "online" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 flex items-center justify-center border border-zinc-950 text-white animate-scaleIn">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        )}
        {status === "offline" && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-rose-500 flex items-center justify-center border border-zinc-950 text-white animate-scaleIn">
            <X className="w-2.5 h-2.5 stroke-[3]" />
          </div>
        )}
      </div>

      {/* Glassmorphic Tooltip */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 z-50 flex flex-col items-center animate-fadeIn pointer-events-none">
          <div className="bg-zinc-950/95 border border-zinc-800 backdrop-blur-md text-white text-[11px] rounded-lg py-1.5 px-2.5 shadow-2xl min-w-[120px] text-center flex flex-col gap-0.5">
            <span className="font-bold text-zinc-100">{name}</span>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              {status === "loading" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  <span className="text-amber-400 font-medium">Verificando...</span>
                </>
              )}
              {status === "online" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-emerald-400 font-medium">Conectado</span>
                  <span className="text-zinc-500 font-mono text-[9px] ml-1">{latency}ms</span>
                </>
              )}
              {status === "offline" && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  <span className="text-rose-400 font-medium">Desconectado</span>
                </>
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
  return (
    <div className="flex items-center justify-center gap-2 mt-3 mb-1">
      {systems.map((system) => (
        <SystemStatusItem key={system} name={system} />
      ))}
    </div>
  );
}
