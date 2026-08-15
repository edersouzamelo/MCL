"use client";

import { Printer, FileCheck, ArrowLeft } from "lucide-react";

export type AdhesionPrintViewProps = {
  content: string;
  onClose?: () => void;
};

export function AdhesionPrintView({ content, onClose }: AdhesionPrintViewProps) {
  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 p-4 sm:p-8 print:p-0 print:bg-white print:text-black">
      {/* Barra de Ações para Tela (oculta na impressão) */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-sm print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
            <FileCheck className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50">Visualização de Impressão / Exportação PDF</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Layout ajustado para impressão oficial em folha A4</p>
          </div>
        </div>
        <div className="flex gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3.5 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir / Salvar PDF
          </button>
        </div>
      </div>

      {/* Folha A4 de Impressão */}
      <div className="max-w-4xl mx-auto bg-white text-zinc-900 border border-zinc-200 p-8 sm:p-12 shadow-lg print:shadow-none print:border-none print:p-0 font-mono text-xs leading-relaxed whitespace-pre-wrap select-all">
        {content}
      </div>
    </div>
  );
}
