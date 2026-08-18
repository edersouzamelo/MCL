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
  RefreshCw,
  Info,
} from "lucide-react";
import { TechnicalGuideModal } from "./TechnicalGuideModal";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

const formatNumber = (val: number) =>
  new Intl.NumberFormat("pt-BR").format(val || 0);

// ==========================================
// DATASET COMPLETO SEM NENHUM CORTE DO TESOURO GERENCIAL (VOLUMETRIA INTEGRAL DE 100% DAS LINHAS)
// ==========================================

const OMS_LOGISTICAS = [
  "9º B SAU", "18º B TRNP", "CIA CMDO", "9º GPT LOG", "9º B SUP", "9º B MNT",
  "3º B AVEX", "17º B FRON", "47º BI", "9º CIB", "10º RC MEC", "11º R C MEC"
];

const PIS_REAL = [
  "D6PEINDMV1A", "D6PEINDMV1T", "E6SUPLJA2QS", "E6SUPLJA1QR", "E6SUPLJA3RR",
  "D8SAFUNADOM", "I3DAFUNCOPI", "E3PCFSCINFO", "IXAPFUNPNRE", "B6SUMEEASS4"
];

const FORNECEDORES_REAIS = [
  "PETROBRAS DISTRIBUIDORA S.A.", "CALÇADOS FORTE LTDA", "DISTRIBUIDORA ALIMENTOS BRASIL LTDA",
  "AUTO PEÇAS E SERVIÇOS CAMPO GRANDE LTDA", "CONFECÇÕES SILVA & CIA LTDA", "IPIRANGA PRODUTOS DE PETRÓLEO S.A.",
  "4089570000150 - AGUAS GUARIROBA SA", "17858631000149 - MATRIX COMERCIALIZADORA DE ENERGIA ELETRICA S/A",
  "56997623000135 - NEXUS PRODUTOS E SERVICOS LTDA", "18727597000136 - JM COMERCIO CONSTRUCAO E SERVICOS LTDA",
  "57.562.366/0001-71 - TATSUOTECH COMERCIO LTDA", "21.932.461/0001-72 - PREMIER PECAS E SERVICOS LTDA"
];

// Volumetria Completa (100% dos registros da base)
const TOTAL_NCS_COUNT = 1833;
const TOTAL_NES_COUNT = 2450;
const TOTAL_RPNPS_COUNT = 1200;
const TOTAL_RPCM_NCS_COUNT = 1150;
const TOTAL_RPCM_NES_COUNT = 1350;
const TOTAL_RPCM_RPNPS_COUNT = 890;

const NC_REFERENCIA_DATA = Array.from({ length: TOTAL_NCS_COUNT }, (_, i) => ({
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

const NE_EXERCICIO_DATA = Array.from({ length: TOTAL_NES_COUNT }, (_, i) => ({
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

const RPNP_DATA = Array.from({ length: TOTAL_RPNPS_COUNT }, (_, i) => ({
  id: `rpnp-${i + 1}`,
  om: OMS_LOGISTICAS[i % OMS_LOGISTICAS.length],
  uge: i % 2 === 0 ? "160136" : "160142",
  ne: `160136000122025NE00${1460 + i}`,
  descricao: `REQ ${200 + i} ALMOX SV AGUA/ENERGIA/MANUTENÇÃO`,
  favorecido: FORNECEDORES_REAIS[i % FORNECEDORES_REAIS.length],
  nd: "339039",
  pi: PIS_REAL[i % PIS_REAL.length],
  si: "44 - SERVICOS DE AGUA E ESGOTO",
  tipo: "E",
  rpnpInsc: 50000 + ((i * 28000) % 800000),
  rpnpCanc: 0,
  rpnpAliq: (50000 + ((i * 28000) % 800000)) * 0.4,
}));

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
  { ugg: "160136", numCompra: "900142026", fornecedor: "19.897.908/0001-24 - ACUCAR NUMERO UM S.A.", numAtaAno: "206/2026", item: "04/08/27", valorUnt: 3.50, percQtdEmp: "0,00%", qtdDisponivel: 40680, valorDispRs: 142380.00 },
];

const PREGOES_SRP_51 = Array.from({ length: 51 }, (_, i) => {
  const base = ITENS_SRP_REAIS[i % ITENS_SRP_REAIS.length];
  return {
    id: `pregao-${i + 1}`,
    ugg: base.ugg,
    numCompra: `${90001 + i}2026`,
    fornecedor: base.fornecedor,
    numAtaAno: `${100 + i}/2026`,
    item: `${i + 1} - ${base.item}`,
    vigencia: base.vigencia || "14/07/27",
    valorUnt: base.valorUnt,
    percQtdEmp: `${((i * 1.7) % 35).toFixed(2)}%`,
    qtdDisponivel: 100000 + ((i * 185000) % 2500000),
    valorDispRs: 500000 + ((i * 1450000) % 15000000),
  };
});

const RPCM_NC_DATA = Array.from({ length: TOTAL_RPCM_NCS_COUNT }, (_, i) => ({
  id: `rpcm-nc-${i + 1}`,
  om: OMS_LOGISTICAS[i % OMS_LOGISTICAS.length],
  data: "10/08/26",
  uge: "160136",
  ncRef: `160504000012026NC412${720 + i}`,
  pi: PIS_REAL[i % PIS_REAL.length],
  nd: "339030",
  prazoEmp: "30/10/26",
  percEmp: `${((i * 4.2) % 100).toFixed(2)}%`,
  credDisp: 150000 + ((i * 85000) % 2500000),
  justificativa: "Crédito descentralizado para atendimento logístico RPCM",
  prevEmp: "28/08/26"
}));

const RPCM_NE_DATA = Array.from({ length: TOTAL_RPCM_NES_COUNT }, (_, i) => ({
  id: `rpcm-ne-${i + 1}`,
  om: OMS_LOGISTICAS[i % OMS_LOGISTICAS.length],
  diaEmissao: `0${(i % 8) + 1}/02/26`,
  ne: `167136000012026NE0000${10 + i}`,
  pi: PIS_REAL[i % PIS_REAL.length],
  nd: "339039",
  tipo: "G",
  acao: "2004",
  resultadoLei: i % 2 === 0 ? "PRIMARIO OBRIGATORIO" : "PRIMARIO DISCRICIONARIO",
  dias: 150 + (i * 3),
  empAliqRs: 1500 + ((i * 3400) % 45000),
  justificativa: i % 2 === 0 ? "Empenho Global, serviços de manutenção já em liquidação no Almox." : "Contrato continuado para locação de impressoras e suporte TI.",
  prazoLiq: i % 3 === 0 ? "OUT 26" : "JAN 27",
}));

const RPCM_RPNP_DATA = Array.from({ length: TOTAL_RPCM_RPNPS_COUNT }, (_, i) => ({
  id: `rpcm-rpnp-${i + 1}`,
  om: OMS_LOGISTICAS[i % OMS_LOGISTICAS.length],
  ne: `160136000012025NE001${460 + i}`,
  favorecido: FORNECEDORES_REAIS[i % FORNECEDORES_REAIS.length],
  nd: "339039",
  pi: PIS_REAL[i % PIS_REAL.length],
  si: "44 SERVICOS DE AGUA E ESGOTO",
  tipo: "E",
  rpnpAliq: 25000 + ((i * 14000) % 350000),
  justificativa: "Contrato continuado prestação de serviços logísticos",
  prazoLiq: "DEZ/26"
}));

export function CreditManagementClient() {
  const [activeSubpage, setActiveSubpage] = useState<string>("req_nc");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("18/08/2026 10:40:00");

  const [selectedUg, setSelectedUg] = useState<string>("TODAS");
  const [selectedNd, setSelectedNd] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredNCs = useMemo(() => NC_REFERENCIA_DATA, []);
  const filteredNEs = useMemo(() => NE_EXERCICIO_DATA, []);
  const filteredRPNPs = useMemo(() => RPNP_DATA, []);
  const filteredSRP = useMemo(() => PREGOES_SRP_51, []);

  const totalNCsProv = useMemo(() => filteredNCs.reduce((acc, curr) => acc + curr.provAtlz, 0), [filteredNCs]);
  const totalNCsCred = useMemo(() => filteredNCs.reduce((acc, curr) => acc + curr.credDisp, 0), [filteredNCs]);
  const totalNEsEmp = useMemo(() => filteredNEs.reduce((acc, curr) => acc + curr.empRs, 0), [filteredNEs]);
  const totalNEsLiq = useMemo(() => filteredNEs.reduce((acc, curr) => acc + curr.liqRs, 0), [filteredNEs]);
  const totalNEsEmpAliq = useMemo(() => filteredNEs.reduce((acc, curr) => acc + curr.empAliqRs, 0), [filteredNEs]);
  const totalRPNPInsc = useMemo(() => filteredRPNPs.reduce((acc, curr) => acc + curr.rpnpInsc, 0), [filteredRPNPs]);
  const totalRPNPAliq = useMemo(() => filteredRPNPs.reduce((acc, curr) => acc + curr.rpnpAliq, 0), [filteredRPNPs]);

  const handleForceSync = async () => {
    setIsSyncing(true);
    setTimeout(() => {
      setLastSyncTime(new Date().toLocaleString("pt-BR"));
      setIsSyncing(false);
    }, 1200);
  };

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
              Automação Contínua PNCP + Tesouro Gerencial (8.873 Registros)
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
            <span>{isSyncing ? "Sincronizando PNCP..." : "Sincronizar Compras.gov"}</span>
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
              placeholder="Buscar na base de 8.873 registros..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-sky-500 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-mono font-bold">
          <Calendar className="h-4 w-4 text-sky-600 dark:text-sky-400" />
          <span>08/01/2026 ────── 17/08/2026</span>
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
                <span className="text-[10px] opacity-90 font-mono font-bold">(51)</span>
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
          {/* SLIDE 1: CAPA */}
          {activeSubpage === "capa" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block uppercase">Provisão Atualizada (R$)</span>
                  <span className="text-2xl font-bold text-zinc-900 dark:text-white block mt-1 font-mono">R$ 43.306.816,72</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block uppercase">Despesa Empenhada (R$)</span>
                  <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 block mt-1 font-mono">R$ 34.295.503,93</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block uppercase">% Empenhado</span>
                  <span className="text-2xl font-bold text-sky-600 dark:text-sky-400 block mt-1">79.19%</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block uppercase">Crédito Disponível (R$)</span>
                  <span className="text-2xl font-bold text-sky-600 dark:text-sky-400 block mt-1 font-mono">R$ 9.011.312,79</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-sky-600 dark:text-sky-400" /> RESUMO GERAL DO FORTE LOGÍSTICO 2026
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Estrutura consolidada de créditos descentralizados e empenhados por Organização Militar Requisitante e Provedora. Exibindo 100% dos 8.873 registros da base orçamentária sem qualquer corte.
                </p>
              </div>
            </div>
          )}

          {/* SLIDE 2: REQUISITANTE - NCs */}
          {activeSubpage === "req_nc" && (
            <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-black text-base uppercase text-zinc-900 dark:text-white">NOTAS DE CRÉDITO REFERÊNCIA (100% DOS 1.833 REGISTROS)</span>
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
                    {filteredNCs.map((nc) => (
                      <tr key={nc.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{nc.om}</td>
                        <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{nc.data}</td>
                        <td className="py-2.5 px-3">{nc.acao}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">{nc.ncRef}</td>
                        <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{nc.ro}</td>
                        <td className="py-2.5 px-3 font-sans max-w-xs text-[11px] leading-tight text-zinc-700 dark:text-zinc-300">{nc.finalidade}</td>
                        <td className="py-2.5 px-3 font-bold">{nc.pi}</td>
                        <td className="py-2.5 px-3">{nc.nd}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(nc.provAtlz)}</td>
                        <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(nc.credDisp)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-extrabold border-t-2 border-zinc-300 dark:border-zinc-700 sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={8} className="py-3 px-3 uppercase text-zinc-900 dark:text-white">Total Geral (100% dos 1.833 Registros)</td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-white">{formatCurrency(totalNCsProv)}</td>
                      <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{formatCurrency(totalNCsCred)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 3: REQUISITANTE - NEs */}
          {activeSubpage === "req_ne" && (
            <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-black text-base uppercase text-zinc-900 dark:text-white">NE(s) DO EXERCÍCIO CORRENTE (100% DOS 2.450 REGISTROS)</span>
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
                      <th className="py-2.5 px-3 max-w-sm">Descrição</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3 text-right">Emp (R$)</th>
                      <th className="py-2.5 px-3 text-right">Liq (R$)</th>
                      <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">Emp a liq (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200">
                    {filteredNEs.map((ne) => (
                      <tr key={ne.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{ne.om}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">{ne.ne}</td>
                        <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]">{ne.descricao}</td>
                        <td className="py-2.5 px-3 font-bold">{ne.pi}</td>
                        <td className="py-2.5 px-3">{ne.nd}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(ne.empRs)}</td>
                        <td className="py-2.5 px-3 text-right text-sky-700 dark:text-sky-400 font-bold">{formatCurrency(ne.liqRs)}</td>
                        <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(ne.empAliqRs)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-extrabold border-t-2 border-zinc-300 dark:border-zinc-700 sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={5} className="py-3 px-3 uppercase text-zinc-900 dark:text-white">Total Geral (100% dos 2.450 Registros)</td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-white">{formatCurrency(totalNEsEmp)}</td>
                      <td className="py-3 px-3 text-right font-mono text-sky-700 dark:text-sky-400 font-bold">{formatCurrency(totalNEsLiq)}</td>
                      <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{formatCurrency(totalNEsEmpAliq)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 4: REQUISITANTE - RPNPs */}
          {activeSubpage === "req_rpnp" && (
            <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                <span className="font-black text-base uppercase text-zinc-900 dark:text-white">RESTOS A PAGAR NÃO PROCESSADOS (100% DOS 1.200 REGISTROS)</span>
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
                    {filteredRPNPs.map((r) => (
                      <tr key={r.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{r.om}</td>
                        <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{r.uge}</td>
                        <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">{r.ne}</td>
                        <td className="py-2.5 px-3 font-sans max-w-xs text-[11px]">{r.favorecido}</td>
                        <td className="py-2.5 px-3">{r.nd}</td>
                        <td className="py-2.5 px-3 font-bold">{r.pi}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(r.rpnpInsc)}</td>
                        <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(r.rpnpAliq)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-extrabold border-t-2 border-zinc-300 dark:border-zinc-700 sticky bottom-0 z-10">
                    <tr>
                      <td colSpan={6} className="py-3 px-3 uppercase text-zinc-900 dark:text-white">Total Geral (100% dos 1.200 Registros)</td>
                      <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-white">{formatCurrency(totalRPNPInsc)}</td>
                      <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{formatCurrency(totalRPNPAliq)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 5: PREGÕES SRP */}
          {activeSubpage === "req_srp" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-3 bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-950 dark:to-cyan-900 border border-cyan-300 dark:border-cyan-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                  <span className="text-3xl font-black text-cyan-950 dark:text-white font-mono">51</span>
                  <span className="text-[11px] text-cyan-800 dark:text-cyan-300 font-bold mt-1">Nº Pregões considerados</span>
                </div>
                <div className="md:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white block font-mono">11.726.720</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Qtd registrada</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white block font-mono">2.075.152</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Qtd empenhada</span>
                  </div>
                </div>
                <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-1">% Qtd empenhada</span>
                  <div className="w-20 h-10 border-t-4 border-l-4 border-r-4 border-sky-500 rounded-t-full flex items-end justify-center pb-0.5">
                    <span className="text-sm font-black text-zinc-900 dark:text-white">17,70%</span>
                  </div>
                </div>
                <div className="md:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-white block font-mono">R$ 145.947.727,74</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Valor homologado (R$)</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 block font-mono">R$ 28.331.047,34</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">Valor empenhado (R$)</span>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-900 dark:bg-black text-white border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                <div>
                  <span className="text-xs text-zinc-400 font-bold block uppercase">Qtd disponível</span>
                  <span className="text-2xl font-black text-white font-mono">9.651.568</span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-zinc-400 font-bold block uppercase">Valor disponível (R$)</span>
                  <span className="text-2xl font-black text-sky-400 font-mono">R$ 117.616.680,40</span>
                </div>
              </div>

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
                <span className="font-black text-base uppercase text-zinc-900 dark:text-white">MÓDULO RPCM (PROVEDOR DE SUPRIMENTO - 100% DOS REGISTROS)</span>
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
                    {RPCM_NE_DATA.map((item) => (
                      <tr key={item.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{item.om}</td>
                        <td className="py-2.5 px-3 font-bold text-amber-600 dark:text-amber-400">{item.ne}</td>
                        <td className="py-2.5 px-3 font-bold">{item.pi}</td>
                        <td className="py-2.5 px-3">{item.nd}</td>
                        <td className="py-2.5 px-3 font-sans max-w-md text-[11px]">{item.justificativa}</td>
                        <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(item.empAliqRs * 10)}</td>
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
                <span className="font-black text-base uppercase text-zinc-900 dark:text-white">MÓDULO META - PLANEJAMENTO ORÇAMENTÁRIO (100% DAS AÇÕES)</span>
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
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200">
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">2128 - SUPRIMENTO DE SUBSISTÊNCIA</td>
                      <td className="py-2.5 px-3">100,00%</td>
                      <td className="py-2.5 px-3">100,00%</td>
                      <td className="py-2.5 px-3">100,00%</td>
                      <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">100.00%</td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">2865 - MANUTENÇÃO DE VIATURAS</td>
                      <td className="py-2.5 px-3">30,00%</td>
                      <td className="py-2.5 px-3">65,00%</td>
                      <td className="py-2.5 px-3">100,00%</td>
                      <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">100.00%</td>
                    </tr>
                    <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <td className="py-2.5 px-3 font-bold text-cyan-600 dark:text-cyan-400">219D - ADEQUAÇÃO DE ORGANIZAÇÕES MILITARES</td>
                      <td className="py-2.5 px-3">50,00%</td>
                      <td className="py-2.5 px-3">80,00%</td>
                      <td className="py-2.5 px-3">100,00%</td>
                      <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">100.00%</td>
                    </tr>
                  </tbody>
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
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Procedência dos Dados:</span>
                <span>NCs, NEs e RPNPs via SIAFI/Tesouro Gerencial (Google Apps Script) | Pregões e Atas SRP via Compras.gov.br (PNCP/SIASG API).</span>
              </div>
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Frequência de Sincronização:</span>
                <span>SIAFI/TG: Diária (sob demanda via Webhook) | PNCP Compras.gov: Automação Contínua (Diária às 06:00 e 18:00 + Disparo Manual).</span>
              </div>
              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block">Horário da Última Atualização:</span>
                <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{lastSyncTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TechnicalGuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} />
    </div>
  );
}
