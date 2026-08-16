"use client";

import React from "react";
import { Search, Filter, RefreshCw } from "lucide-react";
import { CreditFilterOptions } from "@/modules/credits/types";

interface CreditFilterBarProps {
  filters: CreditFilterOptions;
  onChange: (newFilters: CreditFilterOptions) => void;
  onReset: () => void;
}

export function CreditFilterBar({ filters, onChange, onReset }: CreditFilterBarProps) {
  return (
    <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm transition-colors mb-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Left Section: Search Input */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por código, UG, PI, favorecido, NE ou ND..."
            value={filters.searchQuery || ""}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            className="w-full pl-9 pr-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Right Section: Select Dropdowns & Reset Button */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400 hidden sm:inline-block" />
            <select
              value={filters.financialYear || 2026}
              onChange={(e) => onChange({ ...filters, financialYear: Number(e.target.value) })}
              className="bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value={2026}>Exercício: 2026</option>
              <option value={2025}>Exercício: 2025</option>
            </select>
          </div>

          <select
            value={filters.ugCode || ""}
            onChange={(e) => onChange({ ...filters, ugCode: e.target.value || undefined })}
            className="bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Todas as UGs</option>
            <option value="160001">160001 - COLOG</option>
            <option value="160091">160091 - Dep. Central Fardamento</option>
            <option value="160205">160205 - 21º D Sup</option>
          </select>

          <select
            value={filters.expenseNature || ""}
            onChange={(e) => onChange({ ...filters, expenseNature: e.target.value || undefined })}
            className="bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Todas as NDs</option>
            <option value="339030">3.3.90.30 - Mat. Consumo</option>
            <option value="449052">4.4.90.52 - Mat. Permanente</option>
            <option value="339039">3.3.90.39 - Serviços Terceiros</option>
          </select>

          <select
            value={filters.resourceSource || ""}
            onChange={(e) => onChange({ ...filters, resourceSource: e.target.value || undefined })}
            className="bg-zinc-100 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Todas as Fontes</option>
            <option value="0100">Fonte 0100 - Ordinários</option>
            <option value="0142">Fonte 0142 - Defesa</option>
            <option value="0180">Fonte 0180 - Acordos Int.</option>
          </select>

          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg transition-colors"
            title="Limpar Filtros"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Limpar
          </button>
        </div>
      </div>
    </div>
  );
}
