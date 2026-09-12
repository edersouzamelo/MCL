"use client";

import { TgSourcePanel } from "./TgSourcePanel";
import type { TgSnapshotMetadata } from "@/modules/credits-tg/repository";
import { projectTgOperational } from "@/modules/credits-tg/projection";
import { TechnicalGuideModal } from "./TechnicalGuideModal";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Wallet,
  BookOpen,
  PieChart as PieIcon,
  ShieldCheck,
  ChevronRight,
  Filter,
  Search,
  Calendar,
  RefreshCw,
  Info,
} from "lucide-react";


const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const formatNumber = (val: number) =>
  new Intl.NumberFormat("pt-BR").format(val || 0);

const dateKey = (value: unknown) => {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}` : "";
};

function EvidenceCard({ label, value, tone = "sky" }: { label: string; value: string; tone?: "sky" | "amber" | "emerald" | "rose" }) {
  const colors = { sky: "text-sky-600 dark:text-sky-400", amber: "text-amber-600 dark:text-amber-400", emerald: "text-emerald-600 dark:text-emerald-400", rose: "text-rose-600 dark:text-rose-400" };
  return <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><span className="block text-[10px] font-black uppercase text-zinc-500">{label}</span><span className={`mt-1 block font-mono text-xl font-black ${colors[tone]}`}>{value}</span></div>;
}

function RatioGauge({ label, ratio, tone = "sky" }: { label: string; ratio: number | null; tone?: "sky" | "emerald" | "rose" }) {
  const pct = Math.max(0, Math.min(100, (ratio ?? 0) * 100));
  const stroke = tone === "emerald" ? "#10b981" : tone === "rose" ? "#f43f5e" : "#0ea5e9";
  return <div className="rounded-2xl border border-zinc-200 bg-white p-3 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900"><span className="text-[10px] font-black uppercase text-zinc-500">{label}</span><div className="relative mx-auto mt-1 h-16 w-28 overflow-hidden"><div className="absolute inset-x-1 top-1 h-24 rounded-full" style={{ background: `conic-gradient(from 270deg, ${stroke} ${pct / 2}%, #e4e4e7 0 50%, transparent 0)` }} /><div className="absolute inset-x-4 top-4 h-20 rounded-full bg-white dark:bg-zinc-900" /><span className="absolute inset-x-0 top-8 font-mono text-lg font-black">{ratio == null ? "—" : `${pct.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`}</span></div></div>;
}

type Srp = { id: string; ugg: string; numCompra: string; fornecedor: string; numAtaAno: string; item: string; vigencia: string; valorUnt: number; percQtdEmp: string; qtdDisponivel: number; valorDispRs: number };
type Rpcm = { id: string; om: string; codigo: string; pi: string; nd: string; justificativa: string; saldo: number; ug?: string };
// Empty sections mean unavailable source, never a zero financial balance.
const PREGOES_SRP: Srp[] = [];
const RPCM_NC_DATA: Rpcm[] = [];
const RPCM_NE_DATA: Rpcm[] = [];
const RPCM_RPNP_DATA: Rpcm[] = [];

export function CreditManagementClient() {
  const [activeSubpage, setActiveSubpage] = useState<string>("tg_movements");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [tgSnapshot, setTgSnapshot] = useState<TgSnapshotMetadata | null>(null);
  const lastSyncTime = tgSnapshot ? `Importação: ${new Date(tgSnapshot.importedAt).toLocaleString("pt-BR")}; referência contábil não informada` : "Não confirmada";
  const [sourceMessage, setSourceMessage] = useState("Verificando disponibilidade da fonte Tesouro Gerencial…");

  const [selectedUg, setSelectedUg] = useState<string>("TODAS");
  const [selectedNd, setSelectedNd] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [operational, setOperational] = useState(() => projectTgOperational(null));

  const matches = useCallback((row: object) => {
    const fields = row as Record<string, unknown>;
    const ug = fields.ug ?? fields.uge ?? fields.ugg;
    const rowDate = dateKey(fields.date);
    return (selectedUg === "TODAS" || ug === selectedUg)
      && (selectedNd === "TODAS" || fields.nd === selectedNd)
      && (!startDate || !rowDate || rowDate >= startDate)
      && (!endDate || !rowDate || rowDate <= endDate)
      && Object.values(fields).join(" ").toLocaleLowerCase("pt-BR").includes(searchQuery.trim().toLocaleLowerCase("pt-BR"));
  }, [selectedUg, selectedNd, searchQuery, startDate, endDate]);
  const filteredNCs = useMemo(() => operational.ncMovements.filter(matches), [operational.ncMovements, matches]);
  const filteredPiNd = useMemo(() => operational.piNdMovements.filter(matches), [operational.piNdMovements, matches]);
  const filteredNEs = useMemo(() => operational.neExecution.filter(matches), [operational.neExecution, matches]);
  const filteredRPNPs = useMemo(() => operational.rpnpMovements.filter(matches), [operational.rpnpMovements, matches]);
  const filteredSRP = useMemo(() => PREGOES_SRP.filter(matches), [matches]);
  const filteredRpcm = useMemo(() => (activeSubpage === "rpcm_nc" ? RPCM_NC_DATA : activeSubpage === "rpcm_rpnp" ? RPCM_RPNP_DATA : RPCM_NE_DATA).filter(matches), [activeSubpage, matches]);
  const totalNCsProv = useMemo(() => filteredNCs.reduce((acc, curr) => acc + curr.provisionUpdatedCents, 0) / 100, [filteredNCs]);
  const totalNCsCred = useMemo(() => filteredNCs.reduce((acc, curr) => acc + curr.availableCreditCents, 0) / 100, [filteredNCs]);
  const totalPiNdMovement = useMemo(() => filteredPiNd.reduce((acc, curr) => acc + curr.movementCents, 0) / 100, [filteredPiNd]);
  const totalNeMovement = useMemo(() => filteredNEs.reduce((acc, curr) => acc + curr.committedCents, 0) / 100, [filteredNEs]);
  const totalRPNPInsc = useMemo(() => filteredRPNPs.reduce((acc, curr) => acc + curr.registeredCents + curr.reinscribedCents, 0) / 100, [filteredRPNPs]);
  const totalRPNPAliq = useMemo(() => filteredRPNPs.reduce((acc, curr) => acc + curr.toLiquidateCents, 0) / 100, [filteredRPNPs]);
  const scopeKpis = useMemo(() => ({
    provisionUpdatedCents: filteredNCs.reduce((sum, row) => sum + row.provisionUpdatedCents, 0),
    availableCreditCents: filteredNCs.reduce((sum, row) => sum + row.availableCreditCents, 0),
    committedCents: filteredNEs.reduce((sum, row) => sum + row.committedCents, 0),
    liquidatedCents: filteredNEs.reduce((sum, row) => sum + row.liquidatedCents, 0),
    committedToLiquidateCents: filteredNEs.reduce((sum, row) => sum + row.committedToLiquidateCents, 0),
    paidCents: filteredNEs.reduce((sum, row) => sum + row.paidCents, 0),
  }), [filteredNCs, filteredNEs]);
  const reconciledAvailableCents = scopeKpis.provisionUpdatedCents - scopeKpis.committedCents;
  const committedRatio = scopeKpis.provisionUpdatedCents ? scopeKpis.committedCents / scopeKpis.provisionUpdatedCents : null;
  const liquidatedRatio = scopeKpis.provisionUpdatedCents ? scopeKpis.liquidatedCents / scopeKpis.provisionUpdatedCents : null;
  const rpnpKpis = useMemo(() => ({
    registered: filteredRPNPs.reduce((sum, row) => sum + row.registeredCents + row.reinscribedCents, 0),
    liquidated: filteredRPNPs.reduce((sum, row) => sum + row.liquidatedCents, 0),
    cancelled: filteredRPNPs.reduce((sum, row) => sum + row.cancelledCents, 0),
    toLiquidate: filteredRPNPs.reduce((sum, row) => sum + row.toLiquidateCents, 0),
  }), [filteredRPNPs]);

  const handleForceSync = useCallback(async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/creditos", { cache: "no-store" });
      const payload = await response.json();
      setTgSnapshot(response.ok ? payload.snapshot ?? null : null);
      setOperational(response.ok && payload.operational ? payload.operational : projectTgOperational(null));
      setSourceMessage(response.ok && payload.snapshot ? "Relatório TG V2 projetado: provisão, crédito disponível, execução, NC, NE e RPNP disponíveis por UG executora." : payload.error ?? "Fonte TG ainda não validada para este painel.");
    } catch {
      setTgSnapshot(null);
      setOperational(projectTgOperational(null));
      setSourceMessage("Não foi possível verificar a fonte Tesouro Gerencial. Tente atualizar a leitura.");
    } finally { setIsSyncing(false); }
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(() => { void handleForceSync(); });
    return () => cancelAnimationFrame(frame);
  }, [handleForceSync]);

  return (
    <div className="mcl-credit-workspace space-y-6 pb-12 bg-zinc-50 dark:bg-[#121316] text-zinc-900 dark:text-zinc-100 p-4 md:p-6 rounded-2xl min-h-screen transition-colors duration-200">
      {/* Top Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/10 text-sky-700 dark:text-sky-400 border border-sky-500/30 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> SIAFI (TG) + Compras.gov.br (PNCP/SIASG)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
              Créditos da Grande Unidade · TG V2 homologado
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            PAINEL DE EXECUÇÃO ORÇAMENTÁRIA DO FORTE LOGÍSTICO 2026
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleForceSync}
            disabled={isSyncing}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold text-xs shadow transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin text-sky-400" : ""}`} />
            <span>{isSyncing ? "Verificando fonte..." : "Verificar fonte"}</span>
          </button>

          <button
            onClick={() => setIsGuideOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30 text-xs font-bold transition-all flex items-center gap-2"
          >
            <BookOpen className="h-4 w-4" />
            <span>Guia Técnico (Outras OMs)</span>
          </button>
        </div>
      </div>

      {/* Universal Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm dark:shadow-lg flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
            <Filter className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">UG:</span>
            <select
              aria-label="Unidade gestora" value={selectedUg}
              onChange={(e) => setSelectedUg(e.target.value)}
              className="bg-transparent text-zinc-900 dark:text-white font-bold outline-none cursor-pointer"
            >
              <option value="TODAS" className="bg-white dark:bg-zinc-900">Visão macro · todas as UGs</option>
              {operational.ugOptions.map(option => <option key={option.ug} value={option.ug} className="bg-white dark:bg-zinc-900">{option.ug} - {option.om}</option>)}
            </select>
          </div>

          <label className="text-xs">ND <select aria-label="Natureza de despesa" value={selectedNd} onChange={(event) => setSelectedNd(event.target.value)} className="rounded border bg-white p-2 dark:bg-zinc-900"><option value="TODAS">Todas</option>{operational.ndOptions.map(nd => <option key={nd}>{nd}</option>)}</select></label>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Buscar registros" placeholder="Buscar por NC, NE, PI, OM ou fornecedor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold">
          <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>Período</span>
          <input aria-label="Data inicial" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          <span>até</span>
          <input aria-label="Data final" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} className="rounded border border-zinc-300 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-900" />
          {(startDate || endDate) && <button onClick={() => { setStartDate(""); setEndDate(""); }} className="rounded bg-rose-100 px-2 py-1 text-rose-700 dark:bg-rose-950">Limpar</button>}
        </div>
      </div>

      {/* Main Grid: Sidebar + Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Power BI Menu Lateral */}
        <div className="lg:col-span-3 space-y-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm dark:shadow-lg h-fit transition-colors">
          <div className="text-xs font-extrabold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 pb-2 mb-3">
            PAINEL POWER BI (10 TELAS)
          </div>

          <button
            onClick={() => setActiveSubpage("capa")}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
              activeSubpage === "capa" ? "bg-sky-500 text-white dark:text-zinc-950 border-sky-600 font-black shadow" : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <span className="flex items-center gap-2"><PieIcon className="h-4 w-4" /> Capa / Painel Geral</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setActiveSubpage("tg_movements")}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
              activeSubpage === "tg_movements" ? "bg-emerald-600 text-white border-emerald-700 font-black shadow" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60"
            }`}
          >
            <span>Dados TG recebidos</span>
            <span className="text-[10px] opacity-90 font-mono">({formatNumber(filteredPiNd.length)})</span>
          </button>

          {/* MÓDULO REQUISITANTE */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-sky-700 dark:text-sky-400 uppercase tracking-wider px-1 pt-2">MÓDULO REQUISITANTE</div>
            <div className="space-y-1 pl-2 border-l-2 border-sky-500/40">
              <button onClick={() => setActiveSubpage("req_nc")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_nc" ? "bg-sky-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>NC(s) - Notas de Crédito</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({formatNumber(filteredNCs.length)})</span>
              </button>
              <button onClick={() => setActiveSubpage("req_ne")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_ne" ? "bg-sky-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>NE(s) - Notas de Empenho</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({formatNumber(filteredNEs.length)})</span>
              </button>
              <button onClick={() => setActiveSubpage("req_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_rpnp" ? "bg-sky-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>RPNPs - Restos a Pagar</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({formatNumber(filteredRPNPs.length)})</span>
              </button>
              <button onClick={() => setActiveSubpage("req_srp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_srp" ? "bg-sky-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>Pregões SRP (Atas)</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({filteredSRP.length})</span>
              </button>
            </div>
          </div>

          {/* MÓDULO RPCM */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider px-1 pt-2">MÓDULO RPCM (PROVEDOR)</div>
            <div className="space-y-1 pl-2 border-l-2 border-amber-500/40">
              <button onClick={() => setActiveSubpage("rpcm_nc")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "rpcm_nc" ? "bg-amber-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>NC(s) - Créditos RPCM</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({formatNumber(RPCM_NC_DATA.length)})</span>
              </button>
              <button onClick={() => setActiveSubpage("rpcm_ne")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "rpcm_ne" ? "bg-amber-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>NE(s) - Empenhos RPCM</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({formatNumber(RPCM_NE_DATA.length)})</span>
              </button>
              <button onClick={() => setActiveSubpage("rpcm_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "rpcm_rpnp" ? "bg-amber-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>RPNPs - Restos a Pagar RPCM</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({formatNumber(RPCM_RPNP_DATA.length)})</span>
              </button>
            </div>
          </div>

          {/* MÓDULO META */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-cyan-700 dark:text-cyan-400 uppercase tracking-wider px-1 pt-2">MÓDULO META</div>
            <div className="space-y-1 pl-2 border-l-2 border-cyan-500/40">
              <button onClick={() => setActiveSubpage("meta_exercicio")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "meta_exercicio" ? "bg-cyan-600 text-white font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                Do Exercício (2026)
              </button>
              <button onClick={() => setActiveSubpage("meta_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "meta_rpnp" ? "bg-cyan-600 text-white font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                De RPNP (Restos a Pagar)
              </button>
            </div>
          </div>
        </div>

        {/* Canvas das 10 Subpáginas */}
        <div className="lg:col-span-9 space-y-6">
          {activeSubpage === "tg_movements" && (
            <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-emerald-300 dark:border-emerald-900 space-y-3">
              <div className="flex flex-col gap-2 border-b border-zinc-200 pb-3 dark:border-zinc-800 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="font-black text-base uppercase">MOVIMENTO LÍQUIDO POR PI E ND</h2>
                  <p className="text-xs text-zinc-600 dark:text-zinc-400">Dados reais do arquivo recebido. Somente linhas específicas PI/ND; subtotais e detalhes de NE foram excluídos desta soma para evitar duplicidade.</p>
                </div>
                <span className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 font-mono">
                  {formatNumber(filteredPiNd.length)} linhas · {formatCurrency(totalPiNdMovement)}
                </span>
              </div>
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-700 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">UG</th>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">Descrição do PI</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3">Descrição da ND</th>
                      <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white">Movim. Líquido</th>
                      <th className="py-2.5 px-3">Rastro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200">
                    {!filteredPiNd.length && <tr><td colSpan={8} className="p-6 text-center text-zinc-500">Nenhuma linha PI/ND disponível para os filtros selecionados.</td></tr>}
                    {filteredPiNd.slice(0, 500).map(row => (
                      <tr key={row.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                        <td className="py-2.5 px-3 font-bold">{row.ug}</td>
                        <td className="py-2.5 px-3 font-sans text-[11px]">{row.om}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-700 dark:text-emerald-400">{row.pi}</td>
                        <td className="py-2.5 px-3 font-sans text-[11px]">{row.piDescription ?? "—"}</td>
                        <td className="py-2.5 px-3">{row.nd}</td>
                        <td className="py-2.5 px-3 font-sans text-[11px]">{row.ndDescription ?? "—"}</td>
                        <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(row.movementCents / 100)}</td>
                        <td className="py-2.5 px-3 text-zinc-500">{row.sheet}/{row.sourceRow}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 1: CAPA */}
          {activeSubpage === "capa" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block uppercase">Provisão atualizada</span>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white block mt-1 font-mono">{tgSnapshot ? formatCurrency(scopeKpis.provisionUpdatedCents / 100) : "—"}</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block uppercase">Despesas empenhadas</span>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 block mt-1 font-mono">{tgSnapshot ? formatCurrency(scopeKpis.committedCents / 100) : "—"}</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block uppercase">Crédito disponível</span>
                  <span className="text-2xl font-bold text-sky-600 dark:text-sky-400 block mt-1">{tgSnapshot ? formatCurrency(reconciledAvailableCents / 100) : "—"}</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block uppercase">Despesas liquidadas</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">{tgSnapshot ? formatCurrency(scopeKpis.liquidatedCents / 100) : "—"}</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" /> RESUMO GERAL DO FORTE LOGÍSTICO 2026
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Visão das UGs executoras selecionadas. A fonte identifica {operational.piCount} PIs e {operational.neCount} NEs. Empenhado a liquidar: {formatCurrency(scopeKpis.committedToLiquidateCents / 100)}; pago no exercício: {formatCurrency(scopeKpis.paidCents / 100)}. A OM beneficiária/requisitante não é inferida da UG administrativa.
                </p>
                <div className="space-y-2"><div className="flex h-8 overflow-hidden rounded-lg bg-zinc-200 dark:bg-zinc-800" title="Composição da provisão atualizada"><div className="bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, (liquidatedRatio ?? 0) * 100))}%` }} /><div className="bg-amber-500" style={{ width: `${Math.max(0, Math.min(100, ((scopeKpis.committedToLiquidateCents / (scopeKpis.provisionUpdatedCents || 1)) * 100)))}%` }} /><div className="bg-sky-500" style={{ width: `${Math.max(0, Math.min(100, (reconciledAvailableCents / (scopeKpis.provisionUpdatedCents || 1)) * 100))}%` }} /></div><div className="flex flex-wrap gap-4 text-[11px] font-bold"><span className="text-emerald-600">■ Liquidado</span><span className="text-amber-600">■ Empenhado a liquidar</span><span className="text-sky-600">■ Crédito disponível</span></div></div>
              </div>
            </div>
          )}

          {/* SLIDE 2: REQUISITANTE - NCs */}
          {activeSubpage === "req_nc" && (
            <div className="space-y-3"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><EvidenceCard label="Provisão atualizada" value={formatCurrency(scopeKpis.provisionUpdatedCents / 100)} /><EvidenceCard label="Despesa empenhada" value={formatCurrency(scopeKpis.committedCents / 100)} tone="amber" /><RatioGauge label="% empenhado" ratio={committedRatio} /><EvidenceCard label="Crédito disponível" value={formatCurrency(reconciledAvailableCents / 100)} tone="sky" /></div><div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-black text-base uppercase text-zinc-900 dark:text-white">NOTAS DE CRÉDITO REFERÊNCIA</span>
                <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
                  Exibindo {formatNumber(filteredNCs.length)} Registros
                </span>
              </div>
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-700 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Ação</th>
                      <th className="py-2.5 px-3">NC REFERÊNCIA</th>
                      <th className="py-2.5 px-3">RO</th>
                      <th className="py-2.5 px-3 max-w-xs">FINALIDADE</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3 text-right">Prov atlzd</th>
                      <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-extrabold">CRED DISP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200">
                    {!filteredNCs.length && <tr><td colSpan={10} className="p-6 text-center text-zinc-500">Nenhuma NC disponível para os filtros selecionados.</td></tr>}
                    {filteredNCs.slice(0, 500).map((nc) => (
                      <tr key={nc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{nc.om}</td>
                        <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{nc.date}</td>
                        <td className="py-2.5 px-3">{nc.action}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">{nc.nc}</td>
                        <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{nc.ro}</td>
                        <td className="py-2.5 px-3 font-sans max-w-xs text-[11px] leading-tight text-zinc-700 dark:text-zinc-300">{nc.purpose}</td>
                        <td className="py-2.5 px-3 font-bold">{nc.pi}</td>
                        <td className="py-2.5 px-3">{nc.nd}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(nc.provisionUpdatedCents / 100)}</td>
                        <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(nc.availableCreditCents / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-extrabold border-t-2 border-zinc-300 dark:border-zinc-700 sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={8} className="py-3 px-3 uppercase text-zinc-900 dark:text-white">Total Geral</td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-white">{filteredNCs.length ? formatCurrency(totalNCsProv) : "—"}</td>
                      <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{filteredNCs.length ? formatCurrency(totalNCsCred) : "—"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div></div>
          )}

          {/* SLIDE 3: REQUISITANTE - NEs */}
          {activeSubpage === "req_ne" && (
            <div className="space-y-3"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"><EvidenceCard label="Provisão atualizada" value={formatCurrency(scopeKpis.provisionUpdatedCents / 100)} /><EvidenceCard label="Despesa liquidada" value={formatCurrency(scopeKpis.liquidatedCents / 100)} tone="emerald" /><RatioGauge label="% liquidado" ratio={liquidatedRatio} tone="emerald" /><EvidenceCard label="Empenhado a liquidar" value={formatCurrency(scopeKpis.committedToLiquidateCents / 100)} tone="amber" /></div><div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <div><span className="font-black text-base uppercase text-zinc-900 dark:text-white">NE(s) DO EXERCÍCIO {operational.currentYear ?? "CORRENTE"}</span><p className="text-[11px] text-zinc-500">Valores identificados pelos Itens Informação 29, 30, 31, 32 e 34.</p></div>
                <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
                  Exibindo {formatNumber(filteredNEs.length)} Registros
                </span>
              </div>
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-700 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">NE</th>
                      <th className="py-2.5 px-3 max-w-sm">Favorecido</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3">Descrição da ND</th>
                      <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">Empenhado</th>
                      <th className="py-2.5 px-3">Processo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200">
                    {!filteredNEs.length && <tr><td colSpan={8} className="p-6 text-center text-zinc-500">Nenhuma NE disponível para os filtros selecionados.</td></tr>}
                    {filteredNEs.slice(0, 500).map((ne) => (
                      <tr key={ne.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{ne.om}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">{ne.ne}</td>
                        <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]">{ne.supplier ?? "—"}</td>
                        <td className="py-2.5 px-3 font-bold">{ne.pi ?? "—"}</td>
                        <td className="py-2.5 px-3">{ne.nd}</td>
                        <td className="py-2.5 px-3 font-sans text-[11px]">{ne.ndDescription ?? "—"}</td>
                        <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(ne.committedCents / 100)}</td>
                        <td className="py-2.5 px-3 text-zinc-500">{ne.processNumber}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-extrabold border-t-2 border-zinc-300 dark:border-zinc-700 sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={6} className="py-3 px-3 uppercase text-zinc-900 dark:text-white">Total empenhado das NEs</td>
                      <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{filteredNEs.length ? formatCurrency(totalNeMovement) : "—"}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div></div>
          )}

          {/* SLIDE 4: REQUISITANTE - RPNPs */}
          {activeSubpage === "req_rpnp" && (
            <div className="space-y-3"><div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5"><EvidenceCard label="RPNP inscrito + reinscrito" value={formatCurrency(rpnpKpis.registered / 100)} /><EvidenceCard label="RPNP liquidado" value={formatCurrency(rpnpKpis.liquidated / 100)} tone="emerald" /><EvidenceCard label="RPNP cancelado" value={formatCurrency(rpnpKpis.cancelled / 100)} tone="rose" /><RatioGauge label="% RPNP liquidado" ratio={rpnpKpis.registered ? rpnpKpis.liquidated / rpnpKpis.registered : null} /><EvidenceCard label="RPNP a liquidar" value={formatCurrency(rpnpKpis.toLiquidate / 100)} tone="amber" /></div><div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-black text-base uppercase text-zinc-900 dark:text-white">RESTOS A PAGAR NÃO PROCESSADOS</span>
                <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
                  Exibindo {formatNumber(filteredRPNPs.length)} Registros
                </span>
              </div>
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-700 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">UGE</th>
                      <th className="py-2.5 px-3">NE</th>
                      <th className="py-2.5 px-3 max-w-xs">Favorecido</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3 text-right">RPNP insc</th>
                      <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">RPNP a liq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200">
                    {!filteredRPNPs.length && <tr><td colSpan={8} className="p-6 text-center text-zinc-500">Nenhum RPNP disponível para os filtros selecionados.</td></tr>}
                    {filteredRPNPs.slice(0, 500).map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{r.om}</td>
                        <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{r.ug}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">{r.ne}</td>
                        <td className="py-2.5 px-3 font-sans max-w-xs text-[11px]">{r.supplier}</td>
                        <td className="py-2.5 px-3">{r.nd}</td>
                        <td className="py-2.5 px-3 font-bold">{r.pi}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatCurrency((r.registeredCents + r.reinscribedCents) / 100)}</td>
                        <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(r.toLiquidateCents / 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-extrabold border-t-2 border-zinc-300 dark:border-zinc-700 sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={6} className="py-3 px-3 uppercase text-zinc-900 dark:text-white">Total Geral</td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-white">{filteredRPNPs.length ? formatCurrency(totalRPNPInsc) : "—"}</td>
                      <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{filteredRPNPs.length ? formatCurrency(totalRPNPAliq) : "—"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div></div>
          )}

          {/* SLIDE 5: PREGÕES SRP */}
          {activeSubpage === "req_srp" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3 bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-950 dark:to-cyan-900 border border-cyan-300 dark:border-cyan-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-3xl font-black text-cyan-950 dark:text-white font-mono">—</span>
                  <span className="text-[11px] text-cyan-800 dark:text-cyan-300 font-bold mt-1">Nº Pregões considerados</span>
                </div>
                <div className="md:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white block font-mono">—</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Qtd registrada</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white block font-mono">—</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Qtd empenhada</span>
                  </div>
                </div>
                <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1">% Qtd empenhada</span>
                  <div className="w-20 h-10 border-t-4 border-l-4 border-r-4 border-sky-500 rounded-t-full flex items-end justify-center pb-0.5">
                    <span className="text-sm font-black text-zinc-900 dark:text-white">—</span>
                  </div>
                </div>
                <div className="md:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white block font-mono">—</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Valor homologado (R$)</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 block font-mono">—</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Valor empenhado (R$)</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 dark:bg-black text-white border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <span className="text-xs text-zinc-400 font-bold block uppercase">Qtd disponível</span>
                  <span className="text-2xl font-black text-white font-mono">—</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 font-bold block uppercase">Valor disponível (R$)</span>
                  <span className="text-2xl font-black text-sky-400 font-mono">—</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <span className="font-black text-base uppercase text-zinc-900 dark:text-white">ANÁLISE DE ITENS VIGENTES DE PREGÃO</span>
                  <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
                    Exibindo {filteredSRP.length} Itens Vigentes
                  </span>
                </div>
                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-700 uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">UGG</th>
                        <th className="py-2.5 px-3">Nº compra</th>
                        <th className="py-2.5 px-3 max-w-xs">Fornecedor</th>
                        <th className="py-2.5 px-3">Nº Ata/Ano</th>
                        <th className="py-2.5 px-3 max-w-md">Item</th>
                        <th className="py-2.5 px-3">Vigência</th>
                        <th className="py-2.5 px-3 text-right">Valor Unt</th>
                        <th className="py-2.5 px-3 text-right">% Qtd emp</th>
                        <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-extrabold">Qtd disponível</th>
                        <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-extrabold">Valor disp (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200">
                    <tr><td colSpan={10} className="p-6 text-center text-zinc-500">Aguardando fonte validada desta seção.</td></tr>
                      {filteredSRP.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{item.ugg}</td>
                          <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400 underline">{item.numCompra}</td>
                          <td className="py-2.5 px-3 font-sans max-w-xs text-[11px]" title={item.fornecedor}>{item.fornecedor}</td>
                          <td className="py-2.5 px-3 font-bold text-cyan-700 dark:text-cyan-300">{item.numAtaAno}</td>
                          <td className="py-2.5 px-3 font-sans max-w-md text-[11px] text-cyan-700 dark:text-cyan-400 underline cursor-pointer" title={item.item}>{item.item}</td>
                          <td className="py-2.5 px-3">{item.vigencia}</td>
                          <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(item.valorUnt)}</td>
                          <td className="py-2.5 px-3 text-right bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold">{item.percQtdEmp}</td>
                          <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatNumber(item.qtdDisponivel)}</td>
                          <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(item.valorDispRs)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SLIDES 6, 7, 8: RPCM PROVEDOR */}
          {(activeSubpage === "rpcm_nc" || activeSubpage === "rpcm_ne" || activeSubpage === "rpcm_rpnp") && (
            <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-black text-base uppercase text-zinc-900 dark:text-white">MÓDULO RPCM (PROVEDOR DE SUPRIMENTO)</span>
                <span className="text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-500/20 font-mono">
                  Atendimento às OMs Demandantes
                </span>
              </div>
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-700 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3 max-w-md">Justificativa</th>
                      <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-extrabold">Valor Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200">
                    <tr><td colSpan={10} className="p-6 text-center text-zinc-500">Aguardando fonte validada desta seção.</td></tr>
                    {filteredRpcm.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{item.om}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">{item.codigo}</td>
                        <td className="py-2.5 px-3 font-bold">{item.pi}</td>
                        <td className="py-2.5 px-3">{item.nd}</td>
                        <td className="py-2.5 px-3 font-sans max-w-md text-[11px]">{item.justificativa}</td>
                        <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(item.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDES 9, 10: MÓDULO META */}
          {(activeSubpage === "meta_exercicio" || activeSubpage === "meta_rpnp") && (
            <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-black text-base uppercase text-zinc-900 dark:text-white">MÓDULO META - PLANEJAMENTO ORÇAMENTÁRIO</span>
                <span className="text-xs font-bold bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 px-3 py-1 rounded-full border border-cyan-500/20 font-mono">
                  Hierarquia OM / Ação / PI / ND
                </span>
              </div>
              <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-700 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="py-2.5 px-3">AÇÃO</th>
                      <th className="py-2.5 px-3">Meta Liquidação Junho</th>
                      <th className="py-2.5 px-3">Meta Liquidação Setembro</th>
                      <th className="py-2.5 px-3">Meta Liquidação Dezembro</th>
                      <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-extrabold">Meta Total %</th>
                    </tr>
                  </thead>
                  <tbody><tr><td colSpan={5} className="p-6 text-center text-zinc-500">Metas não homologadas para esta fonte.</td></tr></tbody>
                </table>
              </div>
            </div>
          )}

          {/* LEGENDA OBRIGATÓRIA DE PROCEDÊNCIA E ATUALIZAÇÃO EM TODAS AS TELAS */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm text-xs text-zinc-600 dark:text-zinc-400 space-y-2">
            <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <Info className="h-4 w-4 text-sky-600 dark:text-sky-400" />
              <span>LEGENDA TÉCNICA DE AUDITORIA, PROCEDÊNCIA E ATUALIZAÇÃO DOS DADOS</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Fontes previstas:</span>
                <span>NCs, NEs e RPNPs via SIAFI/Tesouro Gerencial (Google Apps Script) | Pregões e Atas SRP via Compras.gov.br (PNCP/SIASG API).</span>
              </div>
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Frequência de Sincronização:</span>
                <span>TG: atualização diária prevista por subscrição de e-mail e Apps Script; execução ainda não comprovada. SRP: conexão pendente de validação.</span>
              </div>
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Horário da Última Atualização:</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{lastSyncTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <details className="group rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <summary className="cursor-pointer list-none px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
          Fonte, auditoria e detalhes técnicos
        </summary>
        <div className="space-y-3 border-t border-zinc-200 p-4 dark:border-zinc-800">
          <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-200">
            <p className="font-bold">{tgSnapshot ? "Relatório TG recebido · dados reais disponíveis" : "Aguardando relatório Tesouro Gerencial"}</p>
            <p className="mt-1">{sourceMessage}</p>
            <p className="mt-1">Movim. Líquido é exibido sem renomeação contábil. Campos sem fonte confirmada aparecem como — e não representam saldo zero.</p>
          </div>
          <TgSourcePanel snapshot={tgSnapshot} onImported={handleForceSync} />
        </div>
      </details>

      <TechnicalGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
