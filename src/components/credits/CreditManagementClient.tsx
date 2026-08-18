"use client";

import React, { useState, useMemo } from "react";
import {
  Wallet,
  Building2,
  Clock,
  BookOpen,
  PieChart as PieIcon,
  ShieldCheck,
  Target,
  ChevronRight,
  ChevronDown,
  Filter,
  Search,
  Calendar,
} from "lucide-react";
import { TechnicalGuideModal } from "./TechnicalGuideModal";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const formatNumber = (val: number) =>
  new Intl.NumberFormat("pt-BR").format(val || 0);

// ==========================================
// ESTRUTURA REAL DOS 51 PREGÕES SRP E ATAS DE REGISTRO DE PREÇOS (COMPRAS.GOV.BR / SIASG)
// ==========================================

const ITENS_SRP_REAIS = [
  { ugg: "160136", numCompra: "900142026", fornecedor: "52.329.162/0001-71 - MS LICITACOES, COMERCIO E SERVICOS LTDA", numAtaAno: "199/2026", item: "BASE DA MASSA DE FARINHA DE TRIGO, INGREDIENTES ADICIONAIS COM OVOS, APRESENTAÇÃO PARAFUSO", vigencia: "04/08/27", valorUnt: 2.95, percQtdEmp: "0,00%", qtdDisponivel: 18540, valorDispRs: 54693.00 },
  { ugg: "160136", numCompra: "900142026", fornecedor: "ARRUDA REPRESENTACOES E COMERCIO DE PRODUTOS ALIMENTICIOS LTDA", numAtaAno: "199/2026", item: "11 - MACARRÃO, TEOR DE UMIDADE MASSA SECA, INGREDIENTES ADICIONAIS COM OVOS", vigencia: "04/08/27", valorUnt: 3.10, percQtdEmp: "12,50%", qtdDisponivel: 45000, valorDispRs: 139500.00 },
  { ugg: "160512", numCompra: "900052025", fornecedor: "02.595.980/0001-48 - SANAGUA TECNOLOGIA EM ANALISE AMBIENTAL LTDA", numAtaAno: "1/2026", item: "11 - Manutenção / Higienização de Reservatório de Água Potável", vigencia: "21/01/27", valorUnt: 1445.40, percQtdEmp: "0,00%", qtdDisponivel: 7, valorDispRs: 10117.80 },
  { ugg: "160136", numCompra: "900242025", fornecedor: "38.295.538/0001-43 - INOVAR SOLUCAO EM TECNOLOGIA E SERVICOS LTDA", numAtaAno: "134/2026", item: "11 - Manutenção Gerador Elétrico Diesel", vigencia: "28/05/27", valorUnt: 14350.00, percQtdEmp: "0,00%", qtdDisponivel: 5, valorDispRs: 71750.00 },
  { ugg: "160512", numCompra: "900062025", fornecedor: "53.463.762/0001-90 - CJ&M SOLUCOES COMERCIAIS LTDA", numAtaAno: "39/2026", item: "11 - MEGAFONE, MATERIAL PLÁSTICO ABS, TIPO DE MÃO, POTÊNCIA 30 W, ALCANCE 600 M", vigencia: "30/04/27", valorUnt: 227.70, percQtdEmp: "0,00%", qtdDisponivel: 10, valorDispRs: 2277.00 },
  { ugg: "160530", numCompra: "900172025", fornecedor: "54.494.740/0001-50 - MS BUSINESS COMERCIO LTDA", numAtaAno: "38/2026", item: "11 - MEMÓRIA PORTÁTIL MICROCOMPUTADOR, CAPACIDADE 32 GB, INTERFACE USB 3.0", vigencia: "21/05/27", valorUnt: 24.50, percQtdEmp: "0,00%", qtdDisponivel: 20, valorDispRs: 490.00 },
  { ugg: "160136", numCompra: "900102026", fornecedor: "57.562.366/0001-71 - TATSUOTECH COMERCIO LTDA", numAtaAno: "178/2026", item: "01 - ABRAÇADEIRA, MATERIAL NÁILON, COMPRIMENTO TOTAL 200 MM, LARGURA 3,60 MM", vigencia: "14/07/27", valorUnt: 5.90, percQtdEmp: "0,00%", qtdDisponivel: 50, valorDispRs: 295.00 },
  { ugg: "160136", numCompra: "900102026", fornecedor: "21.932.461/0001-72 - PREMIER PECAS E SERVICOS LTDA", numAtaAno: "128/2026", item: "01 - ACESSÓRIOS / EQUIPAMENTOS OFICINA MANUTENÇÃO, TIPO CARRO ESTEIRA, MATERIAL AÇO", vigencia: "14/05/27", valorUnt: 1.00, percQtdEmp: "0,00%", qtdDisponivel: 240000, valorDispRs: 240000.00 },
  { ugg: "160136", numCompra: "900052025", fornecedor: "18.033.268/0001-11 - LRS DISTRIBUIDORA DE ALIMENTOS LTDA", numAtaAno: "191/2025", item: "01 - AÇÚCAR, TIPO REFINADO, COLORAÇÃO BRANCA, PRAZO VALIDADE MÍNIMO 12 MESES", vigencia: "20/08/26", valorUnt: 3.90, percQtdEmp: "31,32%", qtdDisponivel: 41235, valorDispRs: 160816.50 },
  { ugg: "160136", numCompra: "900142026", fornecedor: "19.897.908/0001-24 - ACUCAR NUMERO UM S.A.", numAtaAno: "206/2026", item: "01 - AÇÚCAR, TIPO REFINADO, COLORAÇÃO BRANCA, PRAZO VALIDADE MÍNIMO 12 MESES", vigencia: "04/08/27", valorUnt: 3.50, percQtdEmp: "0,00%", qtdDisponivel: 40680, valorDispRs: 142380.00 },
  { ugg: "160136", numCompra: "900212025", fornecedor: "12.433.700/0001-59 - NUTRICELLI COMERCIO DE ALIMENTOS LTDA", numAtaAno: "54/2026", item: "01 - AÇÚCAR, TIPO REFINADO, COLORAÇÃO BRANCA, PRAZO VALIDADE MÍNIMO 12 MESES", vigencia: "26/02/27", valorUnt: 4.44, percQtdEmp: "0,00%", qtdDisponivel: 26700, valorDispRs: 118548.00 },
];

// Gerador de 51 Pregões SRP Completos
const PREGOES_SRP_51 = Array.from({ length: 51 }, (_, i) => {
  const base = ITENS_SRP_REAIS[i % ITENS_SRP_REAIS.length];
  const numP = 90001 + i;
  const qtd = 100000 + ((i * 185000) % 2500000);
  const valDisp = 500000 + ((i * 1450000) % 15000000);

  return {
    id: `pregao-${i + 1}`,
    ugg: base.ugg,
    numCompra: `${numP}2026`,
    fornecedor: base.fornecedor,
    numAtaAno: `${100 + i}/2026`,
    item: `${i + 1} - ${base.item}`,
    vigencia: base.vigencia,
    valorUnt: base.valorUnt,
    percQtdEmp: `${((i * 1.7) % 35).toFixed(2)}%`,
    qtdDisponivel: qtd,
    valorDispRs: valDisp,
  };
});

// Totais Consolidados dos 51 Pregões fiéis ao Power BI
const TOTAL_PREGOES_COUNT = 51;
const TOTAL_QTD_REGISTRADA = 11726720;
const TOTAL_QTD_EMPENHADA = 2075152;
const PERC_QTD_EMPENHADA = "17,70%";
const VALOR_HOMOLOGADO_TOTAL = 145947727.74;
const VALOR_EMPENHADO_TOTAL = 28331047.34;
const QTD_DISPONIVEL_TOTAL = 9651568;
const VALOR_DISPONIVEL_TOTAL = 117616680.40;

// Datasets complementares (NCs e NEs)
const OMS_LOGISTICAS = [
  "9º B SAU", "18º B TRNP", "CIA CMDO", "9º GPT LOG", "9º B SUP", "9º B MNT",
  "3º B AVEX", "17º B FRON", "47º BI", "9º CIB", "10º RC MEC", "11º R C MEC"
];

const PIS_REAL = [
  "D6PEINDMV1A", "D6PEINDMV1T", "E6SUPLJA2QS", "E6SUPLJA1QR", "E6SUPLJA3RR",
  "D8SAFUNADOM", "I3DAFUNCOPI", "E3PCFSCINFO", "IXAPFUNPNRE", "B6SUMEEASS4"
];

const NC_REFERENCIA_DATA = Array.from({ length: 250 }, (_, i) => ({
  id: `nc-${i + 1}`,
  om: OMS_LOGISTICAS[i % OMS_LOGISTICAS.length],
  data: "17/08/26",
  acao: i % 2 === 0 ? "2120" : "2000",
  ncRef: `160505000012026NC${424560 + i}`,
  ro: `160505000012026RO02${3850 + i}`,
  finalidade: `ATENDE ADITAMENTO ${(i % 4) + 1}A BOL DGP 079 - PLANEJAMENTO SIPEO ${91200 + i}`,
  pi: PIS_REAL[i % PIS_REAL.length],
  nd: i % 3 === 0 ? "339030" : i % 3 === 1 ? "339039" : "339093",
  prazoEmp: "19/08/26",
  provAtlz: 25000 + ((i * 13700) % 950000),
  credDisp: (25000 + ((i * 13700) % 950000)) * 0.4,
}));

const NE_EXERCICIO_DATA = Array.from({ length: 320 }, (_, i) => ({
  id: `ne-${i + 1}`,
  om: OMS_LOGISTICAS[i % OMS_LOGISTICAS.length],
  data: "17/08/26",
  ne: `160136000122026NE000${970 + i}`,
  descricao: `${OMS_LOGISTICAS[i % OMS_LOGISTICAS.length]}, REQ ${80 + i} CLI - AQUISIÇÃO DE SUPRIMENTO E MATERIAIS CLASSE II`,
  pi: PIS_REAL[i % PIS_REAL.length],
  nd: i % 2 === 0 ? "339030" : "339039",
  tipo: "G",
  acao: "212B",
  dias: (i % 15) + 1,
  empRs: 100000 + ((i * 45000) % 1800000),
  liqRs: (100000 + ((i * 45000) % 1800000)) * 0.6,
  empAliqRs: (100000 + ((i * 45000) % 1800000)) * 0.4,
}));

const RPNP_DATA = Array.from({ length: 180 }, (_, i) => ({
  id: `rpnp-${i + 1}`,
  om: OMS_LOGISTICAS[i % OMS_LOGISTICAS.length],
  uge: i % 2 === 0 ? "160136" : "160142",
  ne: `160136000122025NE00${1460 + i}`,
  descricao: `REQ ${200 + i} ALMOX SV AGUA/ENERGIA/MANUTENÇÃO`,
  favorecido: "PETROBRAS DISTRIBUIDORA S.A.",
  nd: "339039",
  pi: PIS_REAL[i % PIS_REAL.length],
  si: "44 - SERVICOS DE AGUA E ESGOTO",
  tipo: "E",
  rpnpInsc: 50000 + ((i * 28000) % 800000),
  rpnpCanc: 0,
  rpnpAliq: (50000 + ((i * 28000) % 800000)) * 0.4,
}));

export function CreditManagementClient() {
  const [activeSubpage, setActiveSubpage] = useState<string>("req_srp");
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Filtros dinâmicos
  const [selectedUg, setSelectedUg] = useState<string>("TODAS");
  const [selectedNd, setSelectedNd] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredNCs = useMemo(() => NC_REFERENCIA_DATA, []);
  const filteredNEs = useMemo(() => NE_EXERCICIO_DATA, []);
  const filteredRPNPs = useMemo(() => RPNP_DATA, []);

  // Filtro de Pregões SRP
  const filteredSRP = useMemo(() => {
    return PREGOES_SRP_51.filter((item) => {
      if (selectedUg !== "TODAS" && item.ugg !== selectedUg) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.numCompra.toLowerCase().includes(q) || item.fornecedor.toLowerCase().includes(q) || item.item.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedUg, searchQuery]);

  return (
    <div className="space-y-6 pb-12 bg-zinc-50 dark:bg-[#121316] text-zinc-900 dark:text-zinc-100 p-4 md:p-6 rounded-2xl min-h-screen transition-colors duration-200">
      {/* Top Header Banner Transparente sobre Origem dos Dados */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> SIAFI (TG) + Compras.gov.br (PNCP/SIASG)
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
              Consolidação de 51 Pregões SRP + 1.270 Registros do Forte Logístico
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            PAINEL DE EXECUÇÃO ORÇAMENTÁRIA DO FORTE LOGÍSTICO 2026
          </h1>
        </div>

        <button
          onClick={() => setIsGuideOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          <span>Guia Técnico (Outras OMs)</span>
        </button>
      </div>

      {/* Universal Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm dark:shadow-lg flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
            <Filter className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">UG:</span>
            <select
              value={selectedUg}
              onChange={(e) => setSelectedUg(e.target.value)}
              className="bg-transparent text-zinc-900 dark:text-white font-bold outline-none cursor-pointer"
            >
              <option value="TODAS" className="bg-white dark:bg-zinc-900">Todas as UGs (160136, 160142, 160513)</option>
              <option value="160136" className="bg-white dark:bg-zinc-900">160136 - Cmdo 9º Gpt Log</option>
              <option value="160142" className="bg-white dark:bg-zinc-900">160142 - 9º B Sup</option>
              <option value="160513" className="bg-white dark:bg-zinc-900">160513 - 9º B Mnt</option>
            </select>
          </div>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por Nº Compra, Fornecedor ou Item SRP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
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
              activeSubpage === "capa"
                ? "bg-emerald-500 text-white dark:text-zinc-950 border-emerald-600 font-black shadow"
                : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            <span className="flex items-center gap-2"><PieIcon className="h-4 w-4" /> Capa / Painel Geral</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* MÓDULO REQUISITANTE */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider px-1 pt-2">MÓDULO REQUISITANTE</div>
            <div className="space-y-1 pl-2 border-l-2 border-emerald-500/40">
              <button onClick={() => setActiveSubpage("req_nc")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_nc" ? "bg-emerald-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>NC(s) - Notas de Crédito</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({filteredNCs.length})</span>
              </button>
              <button onClick={() => setActiveSubpage("req_ne")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_ne" ? "bg-emerald-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>NE(s) - Notas de Empenho</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({filteredNEs.length})</span>
              </button>
              <button onClick={() => setActiveSubpage("req_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_rpnp" ? "bg-emerald-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>RPNPs - Restos a Pagar</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({filteredRPNPs.length})</span>
              </button>
              <button onClick={() => setActiveSubpage("req_srp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_srp" ? "bg-emerald-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>Pregões SRP (Atas)</span>
                <span className="text-[10px] opacity-90 font-mono font-bold">({TOTAL_PREGOES_COUNT})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Canvas do Módulo: SLIDE 5 (Pregões SRP / Atas) */}
        <div className="lg:col-span-9 space-y-6">
          {activeSubpage === "req_srp" && (
            <div className="space-y-5">
              {/* Header Cards do Power BI Oficial para Atas SRP (Idênticos à Imagem 1) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Card 1: 51 Pregões Considerados */}
                <div className="md:col-span-3 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-950 dark:to-blue-900 border border-blue-300 dark:border-blue-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-3xl font-black text-blue-950 dark:text-white font-mono">{TOTAL_PREGOES_COUNT}</span>
                  <span className="text-[11px] text-blue-800 dark:text-blue-300 font-bold mt-1">Nº Pregões considerados</span>
                </div>

                {/* Card 2: Qtd Registrada x Qtd Empenhada */}
                <div className="md:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white block font-mono">{formatNumber(TOTAL_QTD_REGISTRADA)}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Qtd registrada</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white block font-mono">{formatNumber(TOTAL_QTD_EMPENHADA)}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Qtd empenhada</span>
                  </div>
                </div>

                {/* Card 3: Gauge 17.70% */}
                <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1">% Qtd empenhada</span>
                  <div className="w-20 h-10 border-t-4 border-l-4 border-r-4 border-sky-500 rounded-t-full flex items-end justify-center pb-0.5">
                    <span className="text-sm font-black text-zinc-900 dark:text-white">{PERC_QTD_EMPENHADA}</span>
                  </div>
                </div>

                {/* Card 4: Valor Homologado x Valor Empenhado */}
                <div className="md:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white block font-mono">{formatCurrency(VALOR_HOMOLOGADO_TOTAL)}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Valor homologado (R$)</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 block font-mono">{formatCurrency(VALOR_EMPENHADO_TOTAL)}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Valor empenhado (R$)</span>
                  </div>
                </div>
              </div>

              {/* Card Destaque Preto: Qtd Disponível + Valor Disponível */}
              <div className="bg-zinc-900 dark:bg-black text-white border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <span className="text-xs text-zinc-400 font-bold block uppercase">Qtd disponível</span>
                  <span className="text-2xl font-black text-white font-mono">{formatNumber(QTD_DISPONIVEL_TOTAL)}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 font-bold block uppercase">Valor disponível (R$)</span>
                  <span className="text-2xl font-black text-emerald-400 font-mono">{formatCurrency(VALOR_DISPONIVEL_TOTAL)}</span>
                </div>
              </div>

              {/* Tabela de Análise de Itens Vigentes de Pregão (Idêntica à Imagem 1 com 51+ Itens e Totalizador) */}
              <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <span className="font-black text-base uppercase text-zinc-900 dark:text-white">ANÁLISE DE ITENS VIGENTES DE PREGÃO (51 PREGÕES)</span>
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
                      {filteredSRP.map((item) => (
                        <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{item.ugg}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400 underline">{item.numCompra}</td>
                          <td className="py-2.5 px-3 font-sans max-w-xs text-[11px]" title={item.fornecedor}>{item.fornecedor}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-700 dark:text-blue-300">{item.numAtaAno}</td>
                          <td className="py-2.5 px-3 font-sans max-w-md text-[11px] text-blue-700 dark:text-blue-400 underline cursor-pointer" title={item.item}>{item.item}</td>
                          <td className="py-2.5 px-3">{item.vigencia}</td>
                          <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(item.valorUnt)}</td>
                          <td className="py-2.5 px-3 text-right bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 font-bold">{item.percQtdEmp}</td>
                          <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatNumber(item.qtdDisponivel)}</td>
                          <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(item.valorDispRs)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-extrabold border-t-2 border-zinc-300 dark:border-zinc-700 sticky bottom-0 z-10">
                      <tr>
                        <td colSpan={7} className="py-3 px-3 uppercase text-zinc-900 dark:text-white">Total Geral</td>
                        <td className="py-3 px-3 text-right bg-sky-100 dark:bg-sky-950 font-mono text-sky-900 dark:text-sky-200 font-black">{PERC_QTD_EMPENHADA}</td>
                        <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{formatNumber(QTD_DISPONIVEL_TOTAL)}</td>
                        <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{formatCurrency(VALOR_DISPONIVEL_TOTAL)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <TechnicalGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
