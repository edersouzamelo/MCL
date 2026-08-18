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

// ==========================================
// DATASETS INTEGRADOS DO FORTE LOGÍSTICO (100+ REGISTROS)
// ==========================================

const OMS_LOGISTICAS = [
  "9º B SAU", "18º B TRNP", "CIA CMDO", "9º GPT LOG", "9º B SUP", "9º B MNT",
  "3º B AVEX", "17º B FRON", "47º BI", "9º CIB", "10º RC MEC", "11º R C MEC"
];

const PIS_REAL = [
  "D6PEINDMV1A", "D6PEINDMV1T", "E6SUPLJA2QS", "E6SUPLJA1QR", "E6SUPLJA3RR",
  "D8SAFUNADOM", "I3DAFUNCOPI", "E3PCFSCINFO", "IXAPFUNPNRE", "B6SUMEEASS4", "I3DACSPAGES", "I3DACSPENEL"
];

const FORNECEDORES_REAIS = [
  "PETROBRAS DISTRIBUIDORA S.A.", "CALÇADOS FORTE LTDA", "DISTRIBUIDORA ALIMENTOS BRASIL LTDA",
  "AUTO PEÇAS E SERVIÇOS CAMPO GRANDE LTDA", "CONFECÇÕES SILVA & CIA LTDA", "IPIRANGA PRODUTOS DE PETRÓLEO S.A.",
  "4089570000150 - AGUAS GUARIROBA SA", "17858631000149 - MATRIX COMERCIALIZADORA DE ENERGIA ELETRICA S/A",
  "56997623000135 - NEXUS PRODUTOS E SERVICOS LTDA", "18727597000136 - JM COMERCIO CONSTRUCAO E SERVICOS LTDA",
  "57.562.366/0001-71 - TATSUOTECH COMERCIO LTDA", "21.932.461/0001-72 - PREMIER PECAS E SERVICOS LTDA"
];

const NC_REFERENCIA_DATA = Array.from({ length: 60 }, (_, i) => {
  const om = OMS_LOGISTICAS[i % OMS_LOGISTICAS.length];
  const pi = PIS_REAL[i % PIS_REAL.length];
  const prov = 25000 + ((i * 13700) % 950000);
  const cred = prov * (0.35 + ((i % 5) * 0.15));
  const numNc = 424560 + i;

  return {
    id: `nc-${i + 1}`,
    om,
    data: "17/08/26",
    acao: i % 2 === 0 ? "2120" : "2000",
    ncRef: `160505000012026NC${numNc}`,
    ro: `160505000012026RO02${3850 + i}`,
    finalidade: `ATENDE ADITAMENTO ${(i % 4) + 1}A BOL DGP 079 - PLANEJAMENTO SIPEO ${91200 + i}`,
    pi,
    nd: i % 3 === 0 ? "339030" : i % 3 === 1 ? "339039" : "339093",
    prazoEmp: "19/08/26",
    provAtlz: prov,
    credDisp: cred,
  };
});

const NE_EXERCICIO_DATA = Array.from({ length: 60 }, (_, i) => {
  const om = OMS_LOGISTICAS[i % OMS_LOGISTICAS.length];
  const pi = PIS_REAL[i % PIS_REAL.length];
  const emp = 100000 + ((i * 45000) % 1800000);
  const liq = emp * (i % 2 === 0 ? 0.8 : 0.2);
  const empAliq = emp - liq;

  return {
    id: `ne-${i + 1}`,
    om,
    data: "17/08/26",
    ne: `160136000122026NE000${970 + i}`,
    descricao: `${om}, REQ ${80 + i} CLI - AQUISIÇÃO DE SUPRIMENTO E MATERIAIS CLASSE II, NC412729, PE 90014/26 GERENCIADO PELA UASG 160136.`,
    pi,
    nd: i % 2 === 0 ? "339030" : "339039",
    tipo: "G",
    acao: "212B",
    dias: (i % 15) + 1,
    empRs: emp,
    liqRs: liq,
    empAliqRs: empAliq,
  };
});

const RPNP_DATA = Array.from({ length: 40 }, (_, i) => {
  const om = OMS_LOGISTICAS[i % OMS_LOGISTICAS.length];
  const pi = PIS_REAL[i % PIS_REAL.length];
  const fav = FORNECEDORES_REAIS[i % FORNECEDORES_REAIS.length];
  const insc = 50000 + ((i * 28000) % 800000);
  const canc = i % 10 === 0 ? 385.80 : 0;
  const aliq = insc * 0.4;

  return {
    id: `rpnp-${i + 1}`,
    om,
    uge: i % 2 === 0 ? "160136" : "160142",
    ne: `160136000122025NE00${1460 + i}`,
    descricao: `${om}, REQ ${200 + i} ALMOX SV AGUA/ENERGIA/MANUTENÇÃO, CONTRATO DA UASG 160136. REFORCO NE 1014.`,
    favorecido: fav,
    nd: "339039",
    pi,
    si: "44 - SERVICOS DE AGUA E ESGOTO",
    tipo: "E",
    rpnpInsc: insc,
    rpnpCanc: canc,
    rpnpAliq: aliq,
  };
});

const SRP_ATA_DATA = Array.from({ length: 40 }, (_, i) => {
  const fav = FORNECEDORES_REAIS[i % FORNECEDORES_REAIS.length];
  const qtdDisp = 500 + ((i * 1200) % 250000);
  const unt = 3.50 + ((i * 4.2) % 150);
  const valDisp = qtdDisp * unt;

  return {
    id: `srp-${i + 1}`,
    ugg: "160136",
    numCompra: `900${10 + i}2026`,
    fornecedor: fav,
    numAtaAno: `${100 + i}/2026`,
    item: `01 - MATERIAL E INSUMOS LOGÍSTICOS CLASSE II, ITEM ESPECIFICAÇÃO TÉCNICA PADRÃO EME Nº ${i + 1}`,
    vigencia: "14/07/27",
    valorUnt: unt,
    percQtdEmp: `${((i * 3.5) % 45).toFixed(2)}%`,
    qtdDisponivel: qtdDisp,
    valorDispRs: valDisp,
  };
});

const RPCM_NE_DATA = Array.from({ length: 30 }, (_, i) => {
  const om = OMS_LOGISTICAS[i % OMS_LOGISTICAS.length];
  const pi = PIS_REAL[i % PIS_REAL.length];
  const empAliq = 1500 + ((i * 3400) % 45000);
  const dias = 150 + (i * 3);

  return {
    id: `rpcm-ne-${i + 1}`,
    om,
    diaEmissao: `0${(i % 8) + 1}/02/26`,
    ne: `167136000012026NE0000${10 + i}`,
    pi,
    nd: "339039",
    tipo: "G",
    acao: "2004",
    resultadoLei: i % 2 === 0 ? "PRIMARIO OBRIGATORIO" : "PRIMARIO DISCRICIONARIO",
    dias,
    empAliqRs: empAliq,
    justificativa: i % 2 === 0 ? "Empenho Global, serviços de manutenção já em liquidação no Almox." : "Contrato continuado para locação de impressoras e suporte TI.",
    prazoLiq: i % 3 === 0 ? "OUT 26" : "JAN 27",
  };
});

const RPCM_NC_DATA = Array.from({ length: 25 }, (_, i) => ({
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

const RPCM_RPNP_DATA = Array.from({ length: 20 }, (_, i) => ({
  id: `rpcm-rpnp-${i + 1}`,
  om: OMS_LOGISTICAS[i % OMS_LOGISTICAS.length],
  ne: `160136000122025NE001${460 + i}`,
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
  const [activeSubpage, setActiveSubpage] = useState<string>("capa");
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Filtros dinâmicos
  const [selectedUg, setSelectedUg] = useState<string>("TODAS");
  const [selectedNd, setSelectedNd] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedOm, setExpandedOm] = useState<string | null>("9º B SUP");

  // Filtro de NCs
  const filteredNCs = useMemo(() => {
    return NC_REFERENCIA_DATA.filter((item) => {
      if (selectedNd !== "TODAS" && item.nd !== selectedNd) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.ncRef.toLowerCase().includes(q) || item.om.toLowerCase().includes(q) || item.finalidade.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedNd, searchQuery]);

  const totalNCsProv = useMemo(() => filteredNCs.reduce((acc, curr) => acc + curr.provAtlz, 0), [filteredNCs]);
  const totalNCsCred = useMemo(() => filteredNCs.reduce((acc, curr) => acc + curr.credDisp, 0), [filteredNCs]);

  // Filtro de NEs
  const filteredNEs = useMemo(() => {
    return NE_EXERCICIO_DATA.filter((item) => {
      if (selectedNd !== "TODAS" && item.nd !== selectedNd) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.ne.toLowerCase().includes(q) || item.om.toLowerCase().includes(q) || item.descricao.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedNd, searchQuery]);

  const totalNEsEmp = useMemo(() => filteredNEs.reduce((acc, curr) => acc + curr.empRs, 0), [filteredNEs]);
  const totalNEsLiq = useMemo(() => filteredNEs.reduce((acc, curr) => acc + curr.liqRs, 0), [filteredNEs]);
  const totalNEsEmpAliq = useMemo(() => filteredNEs.reduce((acc, curr) => acc + curr.empAliqRs, 0), [filteredNEs]);

  // Filtro RPNPs
  const filteredRPNPs = useMemo(() => {
    return RPNP_DATA.filter((item) => {
      if (selectedUg !== "TODAS" && item.uge !== selectedUg) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return item.ne.toLowerCase().includes(q) || item.om.toLowerCase().includes(q) || item.favorecido.toLowerCase().includes(q);
      }
      return true;
    });
  }, [selectedUg, searchQuery]);

  const totalRPNPInsc = useMemo(() => filteredRPNPs.reduce((acc, curr) => acc + curr.rpnpInsc, 0), [filteredRPNPs]);
  const totalRPNPCanc = useMemo(() => filteredRPNPs.reduce((acc, curr) => acc + curr.rpnpCanc, 0), [filteredRPNPs]);
  const totalRPNPAliq = useMemo(() => filteredRPNPs.reduce((acc, curr) => acc + curr.rpnpAliq, 0), [filteredRPNPs]);

  return (
    <div className="space-y-6 pb-12 bg-zinc-50 dark:bg-[#121316] text-zinc-900 dark:text-zinc-100 p-4 md:p-6 rounded-2xl min-h-screen transition-colors duration-200">
      {/* Top Header Banner MCL (Completamente Responsivo a Tema Claro/Escuro) */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm dark:shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Tesouro Gerencial · 9º Gpt Log 2026
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              10 Telas Power BI (Global Light/Dark Theme)
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

      {/* Universal Power BI Filter Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm dark:shadow-lg flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Select UG */}
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
            <Filter className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">UG:</span>
            <select
              value={selectedUg}
              onChange={(e) => setSelectedUg(e.target.value)}
              className="bg-transparent text-zinc-900 dark:text-white font-bold outline-none cursor-pointer"
            >
              <option value="TODAS" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Todas as UGs (160136, 160142, 160513)</option>
              <option value="160136" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">160136 - Cmdo 9º Gpt Log</option>
              <option value="160142" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">160142 - 9º B Sup</option>
              <option value="160513" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">160513 - 9º B Mnt</option>
            </select>
          </div>

          {/* Select ND */}
          <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
            <span className="text-zinc-500 dark:text-zinc-400 font-medium">ND:</span>
            <select
              value={selectedNd}
              onChange={(e) => setSelectedNd(e.target.value)}
              className="bg-transparent text-zinc-900 dark:text-white font-bold outline-none cursor-pointer"
            >
              <option value="TODAS" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Todas as NDs</option>
              <option value="339030" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">339030 - Material de Consumo</option>
              <option value="339039" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">339039 - Outros Serviços de Terceiros</option>
              <option value="339093" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">339093 - Indenizações e Restituições</option>
            </select>
          </div>

          {/* Busca Global */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por NC, NE, OM ou Favorecido..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        {/* Date Slider */}
        <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs">
          <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-zinc-500 dark:text-zinc-400 font-medium">Período:</span>
          <span className="font-mono text-zinc-900 dark:text-white font-bold">08/01/2026</span>
          <div className="w-20 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-full relative mx-1">
            <div className="absolute left-0 right-0 top-0 bottom-0 bg-emerald-500 rounded-full" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-zinc-400 rounded-full shadow" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white border border-zinc-400 rounded-full shadow" />
          </div>
          <span className="font-mono text-zinc-900 dark:text-white font-bold">17/08/2026</span>
        </div>
      </div>

      {/* Main Grid: Sidebar + Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Power BI Menu Lateral (Flexível a Tema Claro / Escuro) */}
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
                <span className="text-[10px] opacity-75 font-mono">({filteredNCs.length})</span>
              </button>
              <button onClick={() => setActiveSubpage("req_ne")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_ne" ? "bg-emerald-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>NE(s) - Notas de Empenho</span>
                <span className="text-[10px] opacity-75 font-mono">({filteredNEs.length})</span>
              </button>
              <button onClick={() => setActiveSubpage("req_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_rpnp" ? "bg-emerald-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>RPNPs - Restos a Pagar</span>
                <span className="text-[10px] opacity-75 font-mono">({filteredRPNPs.length})</span>
              </button>
              <button onClick={() => setActiveSubpage("req_srp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "req_srp" ? "bg-emerald-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>Pregões SRP (Atas)</span>
                <span className="text-[10px] opacity-75 font-mono">({SRP_ATA_DATA.length})</span>
              </button>
            </div>
          </div>

          {/* MÓDULO RPCM */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase tracking-wider px-1 pt-2">MÓDULO RPCM (PROVEDOR)</div>
            <div className="space-y-1 pl-2 border-l-2 border-amber-500/40">
              <button onClick={() => setActiveSubpage("rpcm_nc")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "rpcm_nc" ? "bg-amber-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>NC(s) - Créditos RPCM</span>
                <span className="text-[10px] opacity-75 font-mono">({RPCM_NC_DATA.length})</span>
              </button>
              <button onClick={() => setActiveSubpage("rpcm_ne")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "rpcm_ne" ? "bg-amber-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>NE(s) - Empenhos RPCM</span>
                <span className="text-[10px] opacity-75 font-mono">({RPCM_NE_DATA.length})</span>
              </button>
              <button onClick={() => setActiveSubpage("rpcm_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between ${activeSubpage === "rpcm_rpnp" ? "bg-amber-500 text-white dark:text-zinc-950 font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                <span>RPNPs - Restos a Pagar RPCM</span>
                <span className="text-[10px] opacity-75 font-mono">({RPCM_RPNP_DATA.length})</span>
              </button>
            </div>
          </div>

          {/* MÓDULO META */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-blue-700 dark:text-blue-400 uppercase tracking-wider px-1 pt-2">MÓDULO META</div>
            <div className="space-y-1 pl-2 border-l-2 border-blue-500/40">
              <button onClick={() => setActiveSubpage("meta_exercicio")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "meta_exercicio" ? "bg-blue-600 text-white font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                Do Exercício (2026)
              </button>
              <button onClick={() => setActiveSubpage("meta_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "meta_rpnp" ? "bg-blue-600 text-white font-extrabold shadow" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}>
                De RPNP (Restos a Pagar)
              </button>
            </div>
          </div>
        </div>

        {/* Canvas da Tela Selecionada */}
        <div className="lg:col-span-9 space-y-6">
          {/* SLIDE 1: CAPA / PAINEL GERAL */}
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
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 block mt-1">79.19%</span>
                </div>
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
                  <span className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold block uppercase">Crédito Disponível (R$)</span>
                  <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">R$ 9.011.312,79</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /> RESUMO GERAL DO FORTE LOGÍSTICO 2026
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  Estrutura consolidada de créditos descentralizados e empenhados por Organização Militar Requisitante e Provedora. Selecione uma tela no menu lateral para visualizar os relatórios detalhados.
                </p>
              </div>
            </div>
          )}

          {/* SLIDE 2: NC(s) - NOTAS DE CRÉDITO REFERÊNCIA */}
          {activeSubpage === "req_nc" && (
            <div className="space-y-5">
              {/* Header Cards do Power BI */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-950/60 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-xl font-extrabold text-blue-950 dark:text-white block font-mono">{formatCurrency(totalNCsProv)}</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Provisão atualizada (R$)</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/40">
                    <span className="text-xl font-extrabold text-blue-900 dark:text-blue-200 block font-mono">R$ 34.295.503,93</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Despesa empenhada (R$)</span>
                  </div>
                </div>

                <div className="md:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">% Empenhado</span>
                  <div className="w-28 h-14 border-t-8 border-l-8 border-r-8 border-emerald-500 rounded-t-full flex items-end justify-center pb-1">
                    <span className="text-xl font-black text-zinc-900 dark:text-white">79.19%</span>
                  </div>
                </div>

                <div className="md:col-span-3 bg-zinc-900 dark:bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-md text-white">
                  <span className="text-2xl font-black tracking-tight font-mono">{formatCurrency(totalNCsCred)}</span>
                  <span className="text-xs text-zinc-400 font-semibold mt-1">Credito disponível (R$)</span>
                </div>
              </div>

              {/* Tabela */}
              <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <span className="font-black text-base uppercase text-zinc-900 dark:text-white">NOTAS DE CRÉDITO REFERÊNCIA</span>
                  <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
                    Exibindo {filteredNCs.length} Registros
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
                        <th className="py-2.5 px-3 text-center">PRAZO EMP</th>
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
                          <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">{nc.ncRef}</td>
                          <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{nc.ro}</td>
                          <td className="py-2.5 px-3 font-sans max-w-xs text-[11px] leading-tight text-zinc-700 dark:text-zinc-300" title={nc.finalidade}>{nc.finalidade}</td>
                          <td className="py-2.5 px-3 font-bold text-zinc-800 dark:text-zinc-200">{nc.pi}</td>
                          <td className="py-2.5 px-3">{nc.nd}</td>
                          <td className="py-2.5 px-3 text-center text-purple-700 dark:text-purple-400 font-bold flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-purple-600" /> {nc.prazoEmp}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(nc.provAtlz)}</td>
                          <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(nc.credDisp)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-extrabold border-t-2 border-zinc-300 dark:border-zinc-700 sticky bottom-0 z-10">
                      <tr>
                        <td colSpan={9} className="py-3 px-3 uppercase text-zinc-900 dark:text-white">Total Geral</td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-white">{formatCurrency(totalNCsProv)}</td>
                        <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{formatCurrency(totalNCsCred)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: NE(s) DO EXERCÍCIO CORRENTE */}
          {activeSubpage === "req_ne" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-5 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-950/60 border border-blue-200 dark:border-blue-800/60 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
                  <div>
                    <span className="text-xl font-extrabold text-blue-950 dark:text-white block font-mono">{formatCurrency(totalNEsEmp)}</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Provisão atualizada (R$)</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800/40">
                    <span className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 block font-mono">{formatCurrency(totalNEsLiq)}</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300 font-medium">Despesa liquidada (R$)</span>
                  </div>
                </div>

                <div className="md:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm">
                  <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase mb-2">% Liquidado</span>
                  <div className="w-28 h-14 border-t-8 border-l-8 border-r-8 border-amber-500 rounded-t-full flex items-end justify-center pb-1">
                    <span className="text-xl font-black text-zinc-900 dark:text-white">42.95%</span>
                  </div>
                </div>

                <div className="md:col-span-3 bg-zinc-900 dark:bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-md text-white">
                  <span className="text-2xl font-black tracking-tight font-mono">{formatCurrency(totalNEsEmpAliq)}</span>
                  <span className="text-xs text-zinc-400 font-semibold mt-1">Empenhado a liquidar (R$)</span>
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 rounded-2xl p-4 shadow-sm dark:shadow-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <span className="font-black text-base uppercase text-zinc-900 dark:text-white">NE(s) DO EXERCÍCIO CORRENTE</span>
                  <span className="text-xs font-bold bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 font-mono">
                    Exibindo {filteredNEs.length} Registros
                  </span>
                </div>

                <div className="overflow-x-auto max-h-[550px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-extrabold border-b border-zinc-200 dark:border-zinc-700 uppercase sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">OM</th>
                        <th className="py-2.5 px-3">Data</th>
                        <th className="py-2.5 px-3">NE</th>
                        <th className="py-2.5 px-3 max-w-sm">Descrição</th>
                        <th className="py-2.5 px-3">PI</th>
                        <th className="py-2.5 px-3">ND</th>
                        <th className="py-2.5 px-3">Tipo</th>
                        <th className="py-2.5 px-3">Ação</th>
                        <th className="py-2.5 px-3">Dias</th>
                        <th className="py-2.5 px-3 text-right">Emp (R$)</th>
                        <th className="py-2.5 px-3 text-right">Liq (R$)</th>
                        <th className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">Emp a liq (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-zinc-800 dark:text-zinc-200">
                      {filteredNEs.map((ne) => (
                        <tr key={ne.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-zinc-900 dark:text-white">{ne.om}</td>
                          <td className="py-2.5 px-3 text-zinc-500 dark:text-zinc-400">{ne.data}</td>
                          <td className="py-2.5 px-3 font-bold text-blue-600 dark:text-blue-400">{ne.ne}</td>
                          <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]" title={ne.descricao}>{ne.descricao}</td>
                          <td className="py-2.5 px-3 font-bold">{ne.pi}</td>
                          <td className="py-2.5 px-3">{ne.nd}</td>
                          <td className="py-2.5 px-3">{ne.tipo}</td>
                          <td className="py-2.5 px-3">{ne.acao}</td>
                          <td className="py-2.5 px-3 text-center">{ne.dias}</td>
                          <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(ne.empRs)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(ne.liqRs)}</td>
                          <td className="py-2.5 px-3 text-right bg-zinc-900 dark:bg-black text-white font-black">{formatCurrency(ne.empAliqRs)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-100 dark:bg-zinc-800 font-extrabold border-t-2 border-zinc-300 dark:border-zinc-700 sticky bottom-0 z-10">
                      <tr>
                        <td colSpan={9} className="py-3 px-3 uppercase text-zinc-900 dark:text-white">Total Geral</td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-900 dark:text-white">{formatCurrency(totalNEsEmp)}</td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-700 dark:text-emerald-400 font-bold">{formatCurrency(totalNEsLiq)}</td>
                        <td className="py-3 px-3 text-right bg-zinc-900 dark:bg-black text-white font-mono font-black text-sm">{formatCurrency(totalNEsEmpAliq)}</td>
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
