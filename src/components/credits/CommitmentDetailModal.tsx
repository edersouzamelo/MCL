"use client";

import React from "react";
import { X, FileText, CheckCircle2, Building2, Calendar, ShieldCheck, Tag, ExternalLink } from "lucide-react";
import { CommitmentRecord } from "@/modules/credits/types";

interface CommitmentDetailModalProps {
  commitment: CommitmentRecord | null;
  onClose: () => void;
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

export function CommitmentDetailModal({ commitment, onClose }: CommitmentDetailModalProps) {
  if (!commitment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                Nota de Empenho (NE): {commitment.neCode}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Código Persistente: {commitment.persistentCode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status and Primary Amounts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800/80">
            <div>
              <span className="text-xs text-zinc-500 block mb-0.5">Empenhado</span>
              <span className="text-sm font-bold text-amber-500">{formatCurrency(commitment.committedAmount)}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-0.5">Liquidado</span>
              <span className="text-sm font-bold text-blue-500">{formatCurrency(commitment.liquidatedAmount)}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-0.5">Pago</span>
              <span className="text-sm font-bold text-emerald-500">{formatCurrency(commitment.paidAmount)}</span>
            </div>
            <div>
              <span className="text-xs text-zinc-500 block mb-0.5">Saldo da NE</span>
              <span className="text-sm font-bold text-zinc-400">{formatCurrency(commitment.balanceAmount)}</span>
            </div>
          </div>

          {/* Favorecido e UG */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mb-1">
                <Building2 className="h-3.5 w-3.5 text-zinc-400" /> Favorecido (Credor)
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{commitment.supplierName}</p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">CNPJ: {commitment.supplierDocument}</p>
            </div>

            <div className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <span className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-400" /> Unidade Gestora (UG)
              </span>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{commitment.ugName}</p>
              <p className="text-xs text-zinc-500 font-mono mt-0.5">UG: {commitment.ugCode}</p>
            </div>
          </div>

          {/* Vínculo Logístico & Instrumento Contratual */}
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
            <h4 className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5" /> Vínculo Logístico MCL
            </h4>
            
            {commitment.needItemDescription ? (
              <div>
                <span className="text-xs text-zinc-500 block">Item / Demanda Classe II:</span>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{commitment.needItemDescription}</p>
              </div>
            ) : null}

            {commitment.acquisitionInstrumentRef ? (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-emerald-500/10">
                <span className="text-zinc-500">Instrumento de Aquisição Vinculado:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                  {commitment.acquisitionInstrumentRef}
                </span>
              </div>
            ) : null}
          </div>

          {/* Metadados do SIAFI */}
          <div className="space-y-2 text-xs text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div className="flex justify-between">
              <span>Natureza de Despesa (ND):</span>
              <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">{commitment.expenseNature}</span>
            </div>
            <div className="flex justify-between">
              <span>Fonte de Recursos:</span>
              <span className="font-mono font-medium text-zinc-700 dark:text-zinc-300">Fonte {commitment.resourceSource}</span>
            </div>
            <div className="flex justify-between">
              <span>Data de Emissão no SIAFI:</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {new Date(commitment.issuedAt).toLocaleDateString("pt-BR")}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sistema Origem:</span>
              <span className="font-mono text-zinc-600 dark:text-zinc-400">{commitment.sourceSystem} ({commitment.sourceRecordId})</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
