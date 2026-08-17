"use client";

import React, { useState } from "react";
import {
  Wallet,
  PieChart as PieIcon,
  FileText,
  DollarSign,
  Layers,
  Building2,
  ShieldCheck,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Target,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  CreditFilterOptions,
  CreditRecord,
  CommitmentRecord,
  CreditNote,
  RPNPRecord,
  SrpProcurement,
  BudgetGoal,
  BudgetExecutionSummary,
  CoverageFinancialMatrixItem,
} from "@/modules/credits/types";
import {
  getCreditRecords,
  getCreditNotes,
  getCommitmentRecords,
  getRPNPs,
  getSrpProcurements,
  getBudgetGoals,
  calculateBudgetSummary,
  getExpenseNatureBreakdown,
  getResourceSourceBreakdown,
  getMonthlyExecutionData,
  getCoverageFinancialMatrix,
} from "@/modules/credits/service";
import { CreditFilterBar } from "./CreditFilterBar";
import { CreditDashboardCharts } from "./CreditDashboardCharts";
import { CommitmentDetailModal } from "./CommitmentDetailModal";
import { TechnicalGuideModal } from "./TechnicalGuideModal";
import { Upload, RefreshCw } from "lucide-react";

export type PowerBiSubpage =
  | "capa"
  | "req_nc"
  | "req_ne"
  | "req_rpnp"
  | "req_srp"
  | "rpcm_nc"
  | "rpcm_ne"
  | "rpcm_rpnp"
  | "meta_exercicio"
  | "meta_rpnp"
  | "mcl_cobertura";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val);
}

export function CreditManagementClient() {
  const [activeSubpage, setActiveSubpage] = useState<PowerBiSubpage>("capa");
  const [filters, setFilters] = useState<CreditFilterOptions>({
    financialYear: 2026,
  });
  const [selectedCommitment, setSelectedCommitment] = useState<CommitmentRecord | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage("Processando planilha do Tesouro Gerencial...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/connectors/siafi/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setUploadMessage(
          `🚀 Sucesso! Planilha '${file.name}' lida com ${data.result.totalRecordsProcessed} registros!`
        );
        // Force state update to re-render 10 subpages
        setFilters((prev) => ({ ...prev }));
      } else {
        setUploadMessage(`⚠️ Erro: ${data.error || "Falha ao ler arquivo"}`);
      }
    } catch (err: any) {
      setUploadMessage(`⚠️ Erro na transmissão: ${err.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const summary: BudgetExecutionSummary = calculateBudgetSummary(filters);
  const credits: CreditRecord[] = getCreditRecords(filters);
  const byExpenseNature = getExpenseNatureBreakdown(filters);
  const byResourceSource = getResourceSourceBreakdown(filters);
  const monthlyExecution = getMonthlyExecutionData();
  const coverageMatrix: CoverageFinancialMatrixItem[] = getCoverageFinancialMatrix();

  // Subpage specific data
  const reqNCs: CreditNote[] = getCreditNotes("REQUISITANTE", filters);
  const rpcmNCs: CreditNote[] = getCreditNotes("RPCM", filters);
  const reqNEs: CommitmentRecord[] = getCommitmentRecords(filters, "REQUISITANTE");
  const rpcmNEs: CommitmentRecord[] = getCommitmentRecords(filters, "RPCM");
  const reqRPNPs: RPNPRecord[] = getRPNPs("REQUISITANTE", filters);
  const rpcmRPNPs: RPNPRecord[] = getRPNPs("RPCM", filters);
  const srpList: SrpProcurement[] = getSrpProcurements(filters);
  const goalsExercicio: BudgetGoal[] = getBudgetGoals("EXERCICIO");
  const goalsRPNP: BudgetGoal[] = getBudgetGoals("RPNP");

  const handleResetFilters = () => {
    setFilters({ financialYear: 2026 });
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input for TG Spreadsheet Ingestion */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Upload Notification Banner */}
      {uploadMessage && (
        <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-lg">
          <span>{uploadMessage}</span>
          <button
            onClick={() => setUploadMessage(null)}
            className="text-emerald-400 hover:text-white font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Tesouro Gerencial · Forte Logístico 2026
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
              10 Telas Power BI + MCL
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7 text-emerald-400" />
            EXECUÇÃO ORÇAMENTÁRIA DO FORTE LOGÍSTICO 2026
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Navegação analítica contendo as 10 páginas idênticas ao Power BI do Tesouro Gerencial (Módulo Requisitante, Módulo RPCM e Módulo Meta) integradas ao MCL.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <button
            onClick={handleFileUploadClick}
            disabled={isUploading}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 hover:bg-emerald-400 font-bold text-xs transition-all flex items-center gap-2 shadow-md disabled:opacity-50"
          >
            {isUploading ? (
              <RefreshCw className="h-4 w-4 animate-spin text-zinc-950" />
            ) : (
              <Upload className="h-4 w-4 text-zinc-950" />
            )}
            <span>{isUploading ? "Processando..." : "Carregar Planilha TG (.xlsx)"}</span>
          </button>

          <button
            onClick={() => setIsGuideOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <span>Guia Técnico (Outras OMs)</span>
          </button>

          <div className="text-right hidden sm:block border-l border-zinc-800 pl-3">
            <span className="text-xs text-zinc-500 block">Atualizado em</span>
            <span className="text-sm font-bold text-emerald-400">17/08/2026 17:33</span>
          </div>
        </div>
      </div>

      {/* Main Layout: Power BI Sidebar Navigation + Content Body */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Power BI Sidebar Menu (Idêntico ao painel do Forte Logístico 2026) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-md text-white space-y-4">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-2 border-b border-zinc-800 pb-2">
              Navegação Power BI (10 Telas)
            </div>

            {/* Item Capa */}
            <div>
              <button
                onClick={() => setActiveSubpage("capa")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between border ${
                  activeSubpage === "capa"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm"
                    : "bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                }`}
              >
                <span className="flex items-center gap-2">
                  <PieIcon className="h-3.5 w-3.5" /> Capa / Painel Geral
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* MÓDULO REQUISITANTE */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> MÓDULO REQUISITANTE
              </div>
              <div className="pl-2 space-y-1 border-l-2 border-emerald-500/30">
                <button
                  onClick={() => setActiveSubpage("req_nc")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "req_nc"
                      ? "bg-emerald-500 text-zinc-950 font-bold"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>NC(s) - Notas de Crédito</span>
                  <span className="text-[10px] opacity-75">({reqNCs.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("req_ne")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "req_ne"
                      ? "bg-emerald-500 text-zinc-950 font-bold"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>NE(s) - Notas de Empenho</span>
                  <span className="text-[10px] opacity-75">({reqNEs.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("req_rpnp")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "req_rpnp"
                      ? "bg-emerald-500 text-zinc-950 font-bold"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>RPNPs - Restos a Pagar</span>
                  <span className="text-[10px] opacity-75">({reqRPNPs.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("req_srp")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "req_srp"
                      ? "bg-emerald-500 text-zinc-950 font-bold"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>Pregões SRP (Atas)</span>
                  <span className="text-[10px] opacity-75">({srpList.length})</span>
                </button>
              </div>
            </div>

            {/* MÓDULO RPCM */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> MÓDULO RPCM (PROVEDOR)
              </div>
              <div className="pl-2 space-y-1 border-l-2 border-amber-500/30">
                <button
                  onClick={() => setActiveSubpage("rpcm_nc")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "rpcm_nc"
                      ? "bg-amber-500 text-zinc-950 font-bold"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>NC(s) - Créditos RPCM</span>
                  <span className="text-[10px] opacity-75">({rpcmNCs.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("rpcm_ne")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "rpcm_ne"
                      ? "bg-amber-500 text-zinc-950 font-bold"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>NE(s) - Empenhos RPCM</span>
                  <span className="text-[10px] opacity-75">({rpcmNEs.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("rpcm_rpnp")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "rpcm_rpnp"
                      ? "bg-amber-500 text-zinc-950 font-bold"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>RPNPs - Restos a Pagar RPCM</span>
                  <span className="text-[10px] opacity-75">({rpcmRPNPs.length})</span>
                </button>
              </div>
            </div>

            {/* MÓDULO META */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider px-2 flex items-center gap-1">
                <Target className="h-3 w-3" /> MÓDULO META
              </div>
              <div className="pl-2 space-y-1 border-l-2 border-blue-500/30">
                <button
                  onClick={() => setActiveSubpage("meta_exercicio")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "meta_exercicio"
                      ? "bg-blue-500 text-white font-bold"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>Do Exercício (2026)</span>
                  <span className="text-[10px] opacity-75">({goalsExercicio.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("meta_rpnp")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "meta_rpnp"
                      ? "bg-blue-500 text-white font-bold"
                      : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>De RPNP (Restos a Pagar)</span>
                  <span className="text-[10px] opacity-75">({goalsRPNP.length})</span>
                </button>
              </div>
            </div>

            {/* MÚLEO MCL */}
            <div className="pt-2 border-t border-zinc-800">
              <button
                onClick={() => setActiveSubpage("mcl_cobertura")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between border ${
                  activeSubpage === "mcl_cobertura"
                    ? "bg-emerald-500 text-zinc-950 border-emerald-400 shadow-md"
                    : "bg-zinc-950/60 border-zinc-800 text-emerald-400 hover:bg-zinc-800"
                }`}
              >
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5" /> Matriz Cobertura MCL
                </span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content Body area for the selected subpage */}
        <div className="lg:col-span-9 space-y-6">
          {/* Universal Filter Bar */}
          <CreditFilterBar filters={filters} onChange={setFilters} onReset={handleResetFilters} />

          {/* Subpage 1: Capa / Visão Geral */}
          {activeSubpage === "capa" && (
            <div className="space-y-6">
              {/* Primary KPI Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-zinc-500 font-semibold block uppercase">Dotação Atualizada</span>
                  <span className="text-xl font-bold text-zinc-900 dark:text-white block mt-1">{formatCurrency(summary.totalUpdated)}</span>
                </div>
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-zinc-500 font-semibold block uppercase">Empenhado</span>
                  <span className="text-xl font-bold text-amber-500 block mt-1">{formatCurrency(summary.totalCommitted)}</span>
                </div>
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-zinc-500 font-semibold block uppercase">Pago</span>
                  <span className="text-xl font-bold text-emerald-500 block mt-1">{formatCurrency(summary.totalPaid)}</span>
                </div>
                <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-zinc-500 font-semibold block uppercase">Saldo Disponível</span>
                  <span className="text-xl font-bold text-emerald-400 block mt-1">{formatCurrency(summary.totalAvailable)}</span>
                </div>
              </div>

              <CreditDashboardCharts
                byExpenseNature={byExpenseNature}
                byResourceSource={byResourceSource}
                monthlyExecution={monthlyExecution}
              />
            </div>
          )}

          {/* Subpage 2: Módulo Requisitante - NC(s) */}
          {activeSubpage === "req_nc" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-emerald-400" />
                    MÓDULO REQUISITANTE — Notas de Crédito / NC(s)
                  </h3>
                  <p className="text-xs text-zinc-500">Créditos descentralizados para atendimento de OMs Demandantes de suprimento.</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {reqNCs.length} registros
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Nota de Crédito (NC)</th>
                      <th className="py-3 px-4">UG Recebedora (Requisitante)</th>
                      <th className="py-3 px-4">PI / Programa</th>
                      <th className="py-3 px-4 text-right">Valor Descentralizado</th>
                      <th className="py-3 px-4 text-right">Saldo Disponível</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {reqNCs.map((nc) => (
                      <tr key={nc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono">
                          <span className="font-bold text-emerald-400 block">{nc.ncCode}</span>
                          <span className="text-xs text-zinc-500">{nc.persistentCode}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">{nc.ugReceiverName}</span>
                          <span className="text-xs text-zinc-500 font-mono">UG: {nc.ugReceiverCode}</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-mono">
                          <span className="block text-zinc-800 dark:text-zinc-200">{nc.planningCode}</span>
                          <span className="text-zinc-500">{nc.budgetProgramName}</span>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatCurrency(nc.amount)}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {formatCurrency(nc.availableBalance)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {nc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 3: Módulo Requisitante - NE(s) */}
          {activeSubpage === "req_ne" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-emerald-400" />
                    MÓDULO REQUISITANTE — Notas de Empenho / NE(s)
                  </h3>
                  <p className="text-xs text-zinc-500">Notas de empenho emitidas pelas OMs requisitantes para fornecedores.</p>
                </div>
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {reqNEs.length} empenhos
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Nota de Empenho (NE)</th>
                      <th className="py-3 px-4">Favorecido (Credor)</th>
                      <th className="py-3 px-4">NC Origem</th>
                      <th className="py-3 px-4 text-right">Empenhado</th>
                      <th className="py-3 px-4 text-right">Pago</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {reqNEs.map((ne) => (
                      <tr key={ne.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-500">{ne.neCode}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{ne.supplierName}</td>
                        <td className="py-3 px-4 text-xs font-mono text-emerald-400">{ne.ncCode || "N/A"}</td>
                        <td className="py-3 px-4 text-right font-bold text-amber-500">{formatCurrency(ne.committedAmount)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-500">{formatCurrency(ne.paidAmount)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {ne.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedCommitment(ne)}
                            className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                          >
                            Ver NE
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 4: Módulo Requisitante - RPNPs */}
          {activeSubpage === "req_rpnp" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-emerald-400" />
                    MÓDULO REQUISITANTE — Restos a Pagar Não Processados (RPNPs)
                  </h3>
                  <p className="text-xs text-zinc-500">Acompanhamento de obrigações de exercícios anteriores a liquidar e pagar.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">RPNP / Exercício</th>
                      <th className="py-3 px-4">Favorecido / Credor</th>
                      <th className="py-3 px-4 text-right">Valor Inscrito</th>
                      <th className="py-3 px-4 text-right">Liquidado / Pago 2026</th>
                      <th className="py-3 px-4 text-right">Saldo a Pagar</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {reqRPNPs.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          {r.rpnpCode} <span className="text-xs text-zinc-500 font-normal">({r.enrollmentYear})</span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">{r.supplierName}</td>
                        <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(r.enrolledAmount)}</td>
                        <td className="py-3 px-4 text-right text-emerald-500 font-semibold">{formatCurrency(r.paidAmount)}</td>
                        <td className="py-3 px-4 text-right font-bold text-amber-500">{formatCurrency(r.balanceAmount)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 5: Módulo Requisitante - Pregões SRP */}
          {activeSubpage === "req_srp" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-emerald-400" />
                    MÓDULO REQUISITANTE — Pregões SRP & Atas de Registro de Preços
                  </h3>
                  <p className="text-xs text-zinc-500">Atas vigentes e limites de adesão/carona para contratação imediata.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Número da Ata / Processo</th>
                      <th className="py-3 px-4">Item / CATMAT</th>
                      <th className="py-3 px-4">Fornecedor Registrado</th>
                      <th className="py-3 px-4 text-right">Valor Unitário</th>
                      <th className="py-3 px-4 text-right">Saldo Adesão (Qtd)</th>
                      <th className="py-3 px-4 text-center">Vigência</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {srpList.map((s) => (
                      <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                          {s.ataNumber} <span className="text-xs text-zinc-500 font-normal">({s.processNumber})</span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                          {s.itemDescription}
                          <span className="block text-zinc-500 font-mono">CATMAT: {s.catmatCode}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-zinc-800 dark:text-zinc-200 font-semibold">{s.supplierName}</td>
                        <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">{formatCurrency(s.unitValue)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">{s.adhesionBalanceQuantity} un</td>
                        <td className="py-3 px-4 text-center text-xs text-zinc-400">
                          {new Date(s.validUntil).toLocaleDateString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 6: Módulo RPCM - NC(s) */}
          {activeSubpage === "rpcm_nc" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-amber-400" />
                    MÓDULO RPCM — Notas de Crédito do Provedor Central
                  </h3>
                  <p className="text-xs text-zinc-500">Créditos sob administração direta da Rede de Suprimento (RPCM).</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">NC RPCM</th>
                      <th className="py-3 px-4">UG Gestora RPCM</th>
                      <th className="py-3 px-4">Ação / PI</th>
                      <th className="py-3 px-4 text-right">Valor Total RPCM</th>
                      <th className="py-3 px-4 text-right">Saldo Disponível</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {rpcmNCs.map((nc) => (
                      <tr key={nc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-400">{nc.ncCode}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{nc.ugReceiverName}</td>
                        <td className="py-3 px-4 text-xs font-mono text-zinc-400">{nc.planningCode}</td>
                        <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(nc.amount)}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">{formatCurrency(nc.availableBalance)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {nc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 7: Módulo RPCM - NE(s) */}
          {activeSubpage === "rpcm_ne" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-amber-400" />
                    MÓDULO RPCM — Notas de Empenho Centralizadas
                  </h3>
                  <p className="text-xs text-zinc-500">Empenhos de grande porte executados pelo RPCM para abastecimento dos depósitos.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Nota de Empenho RPCM</th>
                      <th className="py-3 px-4">Favorecido (Credor)</th>
                      <th className="py-3 px-4 text-right">Empenhado</th>
                      <th className="py-3 px-4 text-right">Paid Amount</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {rpcmNEs.map((ne) => (
                      <tr key={ne.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-amber-500">{ne.neCode}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{ne.supplierName}</td>
                        <td className="py-3 px-4 text-right font-bold text-amber-500">{formatCurrency(ne.committedAmount)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-emerald-500">{formatCurrency(ne.paidAmount)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {ne.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 8: Módulo RPCM - RPNPs */}
          {activeSubpage === "rpcm_rpnp" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-400" />
                    MÓDULO RPCM — Restos a Pagar do Provedor Central
                  </h3>
                  <p className="text-xs text-zinc-500">Restos a Pagar sob gestão do Provedor Central (RPCM).</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">RPNP RPCM</th>
                      <th className="py-3 px-4">Favorecido</th>
                      <th className="py-3 px-4 text-right">Inscrito</th>
                      <th className="py-3 px-4 text-right">Saldo a Pagar</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {rpcmRPNPs.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{r.rpnpCode}</td>
                        <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">{r.supplierName}</td>
                        <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">{formatCurrency(r.enrolledAmount)}</td>
                        <td className="py-3 px-4 text-right font-bold text-amber-500">{formatCurrency(r.balanceAmount)}</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 9: Módulo Meta - Do Exercício */}
          {activeSubpage === "meta_exercicio" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-400" />
                    MÓDULO META — Indicadores do Exercício (2026)
                  </h3>
                  <p className="text-xs text-zinc-500">Acompanhamento das metas de empenho e execução orçamentária estipuladas para 2026.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goalsExercicio.map((g) => (
                  <div key={g.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{g.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {g.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-white">{g.percentageAchieved}%</span>
                      <span className="text-xs text-zinc-400">
                        Realizado: <strong className="text-emerald-400">{formatCurrency(g.achievedAmount)}</strong> / Meta: {formatCurrency(g.targetAmount)}
                      </span>
                    </div>

                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${g.percentageAchieved}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subpage 10: Módulo Meta - De RPNP */}
          {activeSubpage === "meta_rpnp" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-400" />
                    MÓDULO META — Indicadores de Restos a Pagar (RPNP)
                  </h3>
                  <p className="text-xs text-zinc-500">Acompanhamento das metas de liquidação e saneamento de restos a pagar.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {goalsRPNP.map((g) => (
                  <div key={g.id} className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-950/40 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">{g.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        {g.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-2xl font-bold text-white">{g.percentageAchieved}%</span>
                      <span className="text-xs text-zinc-400">
                        Saneado: <strong className="text-emerald-400">{formatCurrency(g.achievedAmount)}</strong> / Meta: {formatCurrency(g.targetAmount)}
                      </span>
                    </div>

                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full" style={{ width: `${g.percentageAchieved}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subpage 11: Mapeamento MCL - Matriz Cobertura */}
          {activeSubpage === "mcl_cobertura" && (
            <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-emerald-400" />
                    MATRIZ DE COBERTURA FINANCEIRA X LOGÍSTICA (MCL)
                  </h3>
                  <p className="text-xs text-zinc-500">Cruzamento de necessidades de Material Classe II com os recursos autorizados do Tesouro Gerencial.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 dark:bg-zinc-950/60 text-xs uppercase text-zinc-500 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Necessidade / Item</th>
                      <th className="py-3 px-4 text-center">Quantidade</th>
                      <th className="py-3 px-4 text-right">Valor Estimado</th>
                      <th className="py-3 px-4">Crédito / NC</th>
                      <th className="py-3 px-4">Empenho (NE)</th>
                      <th className="py-3 px-4 text-right">% Cobertura</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {coverageMatrix.map((item) => (
                      <tr key={item.needId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">{item.itemDescription}</span>
                          <span className="text-xs text-zinc-500 font-mono">{item.needCode}</span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold">{item.requestedQuantity}</td>
                        <td className="py-3 px-4 text-right font-medium">{formatCurrency(item.estimatedTotalValue)}</td>
                        <td className="py-3 px-4 text-xs font-mono text-emerald-400">{item.creditPersistentCode || "Sem crédito"}</td>
                        <td className="py-3 px-4 text-xs font-mono text-amber-400">{item.neCode || "Sem NE"}</td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">{item.financialCoveragePercentage}%</td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
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
        </div>
      </div>

      {/* Modal para detalhes da NE */}
      <CommitmentDetailModal
        commitment={selectedCommitment}
        onClose={() => setSelectedCommitment(null)}
      />

      {/* Modal do Guia de Orientação Técnica (Replicação para outras OMs) */}
      <TechnicalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
