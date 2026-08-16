"use client";

import React, { useState } from "react";
import {
  Wallet,
  PieChart as PieIcon,
  FileText,
  DollarSign,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  Building2,
  Search,
  ExternalLink,
  ShieldCheck,
  Info,
} from "lucide-react";
import {
  CreditFilterOptions,
  CreditRecord,
  CommitmentRecord,
  BudgetExecutionSummary,
  CoverageFinancialMatrixItem,
} from "@/modules/credits/types";
import {
  getCreditRecords,
  getCommitmentRecords,
  calculateBudgetSummary,
  getExpenseNatureBreakdown,
  getResourceSourceBreakdown,
  getMonthlyExecutionData,
  getCoverageFinancialMatrix,
} from "@/modules/credits/service";
import { CreditFilterBar } from "./CreditFilterBar";
import { CreditDashboardCharts } from "./CreditDashboardCharts";
import { CommitmentDetailModal } from "./CommitmentDetailModal";

type ActiveTab = "geral" | "dotacao" | "empenhos" | "execucao" | "cobertura";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

export function CreditManagementClient() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("geral");
  const [filters, setFilters] = useState<CreditFilterOptions>({
    financialYear: 2026,
  });
  const [selectedCommitment, setSelectedCommitment] = useState<CommitmentRecord | null>(null);

  const summary: BudgetExecutionSummary = calculateBudgetSummary(filters);
  const credits: CreditRecord[] = getCreditRecords(filters);
  const commitments: CommitmentRecord[] = getCommitmentRecords(filters);
  const byExpenseNature = getExpenseNatureBreakdown(filters);
  const byResourceSource = getResourceSourceBreakdown(filters);
  const monthlyExecution = getMonthlyExecutionData();
  const coverageMatrix: CoverageFinancialMatrixItem[] = getCoverageFinancialMatrix();

  const handleResetFilters = () => {
    setFilters({ financialYear: 2026 });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Tesouro Gerencial · SIAFI/STN
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
              Piloto Classe II
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7 text-emerald-400" />
            Módulo de Créditos Orçamentários & Tesouro Gerencial
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Gestão analítica de dotações orçamentárias, notas de empenho e liquidações do Exército Brasileiro, com cruzamento direto de cobertura financeira para o Suprimento Classe II.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs text-zinc-500 block">Dotação Atualizada</span>
            <span className="text-lg font-bold text-emerald-400">{formatCurrency(summary.totalUpdated)}</span>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm transition-all hover:border-zinc-700">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Dotação Atualizada</span>
            <Building2 className="h-4 w-4 text-blue-500" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-white">
            {formatCurrency(summary.totalUpdated)}
          </div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
            <span>Inicial: {formatCurrency(summary.totalInitial)}</span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm transition-all hover:border-zinc-700">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Crédito Empenhado</span>
            <FileText className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-xl font-bold text-amber-500">
            {formatCurrency(summary.totalCommitted)}
          </div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
            <span>Execução: {summary.executionPercentageCommitted}%</span>
            <span className="text-amber-500 font-semibold">{summary.countCommitments} NEs</span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm transition-all hover:border-zinc-700">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Crédito Pago</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-xl font-bold text-emerald-500">
            {formatCurrency(summary.totalPaid)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            <span>Liquidado: {formatCurrency(summary.totalLiquidated)}</span>
          </div>
        </div>

        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm transition-all hover:border-zinc-700">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Saldo Disponível</span>
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {formatCurrency(summary.totalAvailable)}
          </div>
          <div className="text-xs text-zinc-500 mt-1 flex items-center gap-1">
            {summary.alertsCount > 0 ? (
              <span className="text-amber-500 font-medium flex items-center gap-0.5">
                <AlertTriangle className="h-3 w-3" /> {summary.alertsCount} dotações em atenção
              </span>
            ) : (
              <span className="text-emerald-500 font-medium flex items-center gap-0.5">
                <CheckCircle2 className="h-3 w-3" /> Saldo suficiente
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Universal Filter Bar */}
      <CreditFilterBar filters={filters} onChange={setFilters} onReset={handleResetFilters} />

      {/* Subpage Navigation Tabs (Power BI Tesouro Gerencial Tabs) */}
      <div className="border-b border-zinc-200 dark:border-zinc-800">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto pb-px" aria-label="Abas do Tesouro Gerencial">
          <button
            onClick={() => setActiveTab("geral")}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "geral"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <PieIcon className="h-4 w-4" />
            Visão Geral (Painel Tesouro)
          </button>

          <button
            onClick={() => setActiveTab("dotacao")}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "dotacao"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Building2 className="h-4 w-4" />
            Créditos & Dotações ({credits.length})
          </button>

          <button
            onClick={() => setActiveTab("empenhos")}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "empenhos"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <FileText className="h-4 w-4" />
            Notas de Empenho - NE ({commitments.length})
          </button>

          <button
            onClick={() => setActiveTab("execucao")}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "execucao"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <DollarSign className="h-4 w-4" />
            Execução Financeira
          </button>

          <button
            onClick={() => setActiveTab("cobertura")}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all flex items-center gap-2 border-b-2 ${
              activeTab === "cobertura"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                : "border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            <Layers className="h-4 w-4" />
            Matriz Cobertura MCL
          </button>
        </nav>
      </div>

      {/* Tab 1: Visão Geral */}
      {activeTab === "geral" && (
        <div className="space-y-6">
          <CreditDashboardCharts
            byExpenseNature={byExpenseNature}
            byResourceSource={byResourceSource}
            monthlyExecution={monthlyExecution}
          />

          {/* Resumo por Natureza de Despesa */}
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
              Síntese por Natureza de Despesa (ND)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">ND / Categoria</th>
                    <th className="py-3 px-4 text-right">Dotação Atualizada</th>
                    <th className="py-3 px-4 text-right">Empenhado</th>
                    <th className="py-3 px-4 text-right">Pago</th>
                    <th className="py-3 px-4 text-right">Saldo Disponível</th>
                    <th className="py-3 px-4 text-right">% Participação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {byExpenseNature.map((item) => (
                    <tr key={item.code} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.label}
                      </td>
                      <td className="py-3 px-4 text-right text-zinc-800 dark:text-zinc-200">
                        {formatCurrency(item.totalUpdated)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-amber-500">
                        {formatCurrency(item.committed)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-emerald-500">
                        {formatCurrency(item.paid)}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-zinc-400">
                        {formatCurrency(item.available)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-zinc-500">
                        {item.percentage}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Dotação & Créditos */}
      {activeTab === "dotacao" && (
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Créditos Orçamentários Descentralizados
              </h3>
              <p className="text-xs text-zinc-500">
                Registro detalhado de dotações iniciais, suplementações e saldos disponíveis por UG e PI.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {credits.length} registros
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Código / PI</th>
                  <th className="py-3 px-4">UG Emitente</th>
                  <th className="py-3 px-4">Programa / Ação</th>
                  <th className="py-3 px-4">ND & Fonte</th>
                  <th className="py-3 px-4 text-right">Dotação Atual</th>
                  <th className="py-3 px-4 text-right">Empenhado</th>
                  <th className="py-3 px-4 text-right">Saldo Disponível</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {credits.map((cred) => (
                  <tr key={cred.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                        {cred.persistentCode}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">{cred.planningCode}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-800 dark:text-zinc-200">
                      <span className="block font-medium">{cred.ugName}</span>
                      <span className="text-xs text-zinc-500 font-mono">UG: {cred.ugCode}</span>
                    </td>
                    <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 text-xs max-w-xs">
                      {cred.budgetProgramName}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      <span className="block text-zinc-800 dark:text-zinc-200">ND {cred.expenseNature}</span>
                      <span className="text-zinc-500">Fonte {cred.resourceSource}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(cred.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-amber-500">
                      {formatCurrency(cred.committedAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatCurrency(cred.availableAmount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          cred.status === "DISPONIVEL"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : cred.status === "EM_EXECUCAO"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}
                      >
                        {cred.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Notas de Empenho - NE */}
      {activeTab === "empenhos" && (
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Notas de Empenho (NE - SIAFI)
              </h3>
              <p className="text-xs text-zinc-500">
                Empenhos emitidos para fornecedores e instrumentos de aquisição vinculados ao suprimento Classe II.
              </p>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
              {commitments.length} empenhos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Nota de Empenho (NE)</th>
                  <th className="py-3 px-4">Favorecido (Credor)</th>
                  <th className="py-3 px-4">UG Emitente</th>
                  <th className="py-3 px-4">Demanda Classe II / ARP</th>
                  <th className="py-3 px-4 text-right">Empenhado</th>
                  <th className="py-3 px-4 text-right">Liquidado / Pago</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {commitments.map((com) => (
                  <tr key={com.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-amber-500 block">{com.neCode}</span>
                      <span className="text-xs text-zinc-500">{com.persistentCode}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">{com.supplierName}</span>
                      <span className="text-xs text-zinc-500 font-mono">CNPJ: {com.supplierDocument}</span>
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="block text-zinc-800 dark:text-zinc-200">{com.ugName}</span>
                      <span className="text-zinc-500 font-mono">UG: {com.ugCode}</span>
                    </td>
                    <td className="py-3 px-4 text-xs max-w-xs">
                      {com.needItemDescription ? (
                        <span className="block font-medium text-zinc-900 dark:text-zinc-100">
                          {com.needItemDescription}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">Sem vínculo Classe II</span>
                      )}
                      {com.acquisitionInstrumentRef ? (
                        <span className="inline-block mt-0.5 text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          {com.acquisitionInstrumentRef}
                        </span>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-amber-500">
                      {formatCurrency(com.committedAmount)}
                    </td>
                    <td className="py-3 px-4 text-right text-xs">
                      <span className="block font-semibold text-emerald-500">{formatCurrency(com.paidAmount)} (Pago)</span>
                      <span className="text-zinc-500">{formatCurrency(com.liquidatedAmount)} (Liq)</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {com.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedCommitment(com)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors"
                      >
                        Detalhes <ExternalLink className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Execução Financeira */}
      {activeTab === "execucao" && (
        <div className="space-y-6">
          <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Fluxo de Execução Orçamentária e Financeira (SIAFI)
            </h3>
            <p className="text-xs text-zinc-500 mb-6">
              Acompanhamento dos três estágios fundamentais: Empenho (NE) → Liquidação (Direito Adquirido) → Pagamento (Ordem Bancária).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                <span className="text-xs font-semibold text-amber-500 uppercase tracking-wider block mb-1">
                  1. Empenhado
                </span>
                <span className="text-2xl font-bold text-amber-500 block mb-1">
                  {formatCurrency(summary.totalCommitted)}
                </span>
                <p className="text-xs text-zinc-400">Reserva de orçamento efetuada para credores contratados.</p>
              </div>

              <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5">
                <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider block mb-1">
                  2. Liquidado
                </span>
                <span className="text-2xl font-bold text-blue-500 block mb-1">
                  {formatCurrency(summary.totalLiquidated)}
                </span>
                <p className="text-xs text-zinc-400">Comprovação do recebimento de fardamento / material Classe II.</p>
              </div>

              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider block mb-1">
                  3. Pago
                </span>
                <span className="text-2xl font-bold text-emerald-500 block mb-1">
                  {formatCurrency(summary.totalPaid)}
                </span>
                <p className="text-xs text-zinc-400">Transferência financeira realizada via Ordem Bancária (OB).</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Cobertura Orçamentária x Logística (Cruzamento MCL) */}
      {activeTab === "cobertura" && (
        <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Layers className="h-5 w-5 text-emerald-400" />
                Matriz de Cobertura Financeira x Logística (MCL)
              </h3>
              <p className="text-xs text-zinc-500">
                Cruzamento entre as Necessidades do Suprimento Classe II, Créditos Disponíveis e Notas de Empenho Emitidas.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Necessidade / Item</th>
                  <th className="py-3 px-4 text-center">Quantidade</th>
                  <th className="py-3 px-4 text-right">Valor Est. Necessidade</th>
                  <th className="py-3 px-4">Crédito Vinculado</th>
                  <th className="py-3 px-4">Nota de Empenho (NE)</th>
                  <th className="py-3 px-4 text-right">% Cobertura Financeira</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {coverageMatrix.map((item) => (
                  <tr key={item.needId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                        {item.itemDescription}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono">{item.needCode}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-zinc-800 dark:text-zinc-200">
                      {item.requestedQuantity}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(item.estimatedTotalValue)}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {item.creditPersistentCode ? (
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          {item.creditPersistentCode}
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">Sem crédito</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs font-mono">
                      {item.neCode ? (
                        <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                          {item.neCode} ({formatCurrency(item.neCommittedAmount || 0)})
                        </span>
                      ) : (
                        <span className="text-zinc-500 italic">Aguardando NE</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {item.financialCoveragePercentage}%
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          item.status === "COBERTO"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : item.status === "PARCIALMENTE_COBERTO"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Inspection Modal for NE */}
      <CommitmentDetailModal
        commitment={selectedCommitment}
        onClose={() => setSelectedCommitment(null)}
      />
    </div>
  );
}
