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
  Upload,
  RefreshCw,
  Layers,
  Filter,
  CheckCircle,
} from "lucide-react";
import { CreditFilterBar } from "./CreditFilterBar";
import { TechnicalGuideModal } from "./TechnicalGuideModal";
import { CreditFilterOptions } from "@/modules/credits/types";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

// ==========================================
// DATASETS REAIS DO FORTE LOGÍSTICO (UG 160136, 160142, 160513)
// ==========================================

interface NcReferenciaItem {
  om: string;
  data: string;
  acao: string;
  ncRef: string;
  ro: string;
  finalidade: string;
  pi: string;
  nd: string;
  prazoEmp: string;
  provAtlz: number;
  credDisp: number;
  justificativa?: string;
  prevEmp?: string;
  percEmp?: string;
}

const NC_REFERENCIA_DATA: NcReferenciaItem[] = [
  { om: "9º B SAU", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424567A", ro: "160505000012026RO023950", finalidade: "ATENDE ADITAMENTO 4A BOL DGP 079_10 JUL 2026_CURSOS FAVORECIDO CAP BRUNO JOS CARDOSO MENDES 01689313544 REFERENTE PLANEJAMENTO SIPEO 91235", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", provAtlz: 35714.08, credDisp: 35714.08, percEmp: "0,00%" },
  { om: "18º B TRNP", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424611A", ro: "160505000012026RO023856", finalidade: "ATENDE ADITAMENTO 2G BOL DGP 082_17 JUL 26_QSG FAVORECIDO 1 TEN FELIPE HANSEN POLESI 42205154885 REFERENTE PLANEJAMENTO SIPEO 91436", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", provAtlz: 61227.20, credDisp: 61227.20, percEmp: "0,00%" },
  { om: "CIA CMDO", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424658A", ro: "160505000012026RO023869", finalidade: "ATENDE ADITAMENTO 3F BOL DGP 082_17 JUL 2026_PRA AS FAVORECIDO S TEN ERASMO MARCIO DA COSTA 02932035630 REFERENTE PLANEJAMENTO SIPEO 91671", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", provAtlz: 29777.54, credDisp: 29777.54, percEmp: "0,00%" },
  { om: "9º B SAU", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424567B", ro: "160505000012026RO023950", finalidade: "ATENDE ADITAMENTO 4A BOL DGP 079_10 JUL 2026_CURSOS FAVORECIDO CAP BRUNO JOS CARDOSO MENDES 01689313544 REFERENTE PLANEJAMENTO SIPEO 91235", pi: "D6PEINDMV1T", nd: "339093", prazoEmp: "19/08/26", provAtlz: 1395.52, credDisp: 1395.52, percEmp: "0,00%" },
  { om: "18º B TRNP", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424611B", ro: "160505000012026RO023856", finalidade: "ATENDE ADITAMENTO 2G BOL DGP 082_17 JUL 26_QSG FAVORECIDO 1 TEN FELIPE HANSEN POLESI 42205154885 REFERENTE PLANEJAMENTO", pi: "D6PEINDMV1T", nd: "339093", prazoEmp: "19/08/26", provAtlz: 18518.14, credDisp: 18518.14, percEmp: "0,00%" },
  { om: "9º B SUP", data: "10/08/26", acao: "2000", ncRef: "160504000012026NC412729", ro: "160504000012026RO001290", finalidade: "ATENDE REQUISIÇÃO DE SUPRIMENTO DE SUBSISTÊNCIA 9º B SUP", pi: "E6SUPLJA2QS", nd: "339030", prazoEmp: "30/10/26", provAtlz: 15000000.00, credDisp: 7680663.92, percEmp: "51,27%", justificativa: "Em execução regular de empenho." },
  { om: "9º B MNT", data: "10/08/26", acao: "2021", ncRef: "160504000012026NC412605", ro: "160504000012026RO001188", finalidade: "MANUTENÇÃO DE VIATURAS MILITARES CLASSE IX", pi: "E6SUPLJA1QR", nd: "339030", prazoEmp: "30/10/26", provAtlz: 203742.00, credDisp: 203742.00, percEmp: "0,00%", justificativa: "Até final de Agosto será empenhado 100%" },
  { om: "18º B TRNP", data: "10/08/26", acao: "2000", ncRef: "160504000012026NC412578", ro: "160504000012026RO001140", finalidade: "SUPRIMENTO DE COMBUSTÍVEIS E LUBRIFICANTES", pi: "E6SUPLJA1QR", nd: "339030", prazoEmp: "30/10/26", provAtlz: 156240.00, credDisp: 156240.00, percEmp: "0,00%", justificativa: "Rerequisições em confecção (2ª provisão de QR)", prevEmp: "28/08/26" },
];

interface NeExercicioItem {
  om: string;
  data: string;
  ne: string;
  descricao: string;
  pi: string;
  nd: string;
  tipo: string;
  acao: string;
  dias: number;
  empRs: number;
  liqRs: number;
  empAliqRs: number;
}

const NE_EXERCICIO_DATA: NeExercicioItem[] = [
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000976", descricao: "9º B SUP, REQ 83 CLI - AQUISIÇÃO DE FRALDINHA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90014/26GERENCIADO PELA UASG 160136-9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 913497.00, liqRs: 0.00, empAliqRs: 913497.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000977", descricao: "9º B SUP, REQ 90 CLI - AQUISIÇÃO DE FILÉ DE TILÁPIA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90021/25 GERENCIADO PELA UASG 160136 - 9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 729800.00, liqRs: 0.00, empAliqRs: 729800.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000978", descricao: "9º B SUP, REQ 91 CLI - AQUISIÇÃO DE FILÉ DE TILÁPIA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90021/25 GERENCIADO PELA UASG 160136 - 9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 729800.00, liqRs: 0.00, empAliqRs: 729800.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000979", descricao: "9º B SUP, REQ 82 CLI - AQUISIÇÃO DE FRALDINHA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90014/26GERENCIADO PELA UASG 160136-9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 885000.00, liqRs: 0.00, empAliqRs: 885000.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000980", descricao: "9º B SUP, REQ 81 CLI - AQUISIÇÃO DE CONTRA FILÉ, 2026NC412729, PREGÃO ELETRÔNICO Nº 90021/25 GERENCIADO PELA UASG 160136-9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 991652.50, liqRs: 0.00, empAliqRs: 991652.50 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000981", descricao: "9º B SUP, REQ 89 CLI - AQUISIÇÃO DE SASSAMI DE FRANGO, 2026NC412729, PREGÃO ELETRÔNICO Nº 90014/26 GERENCIADO PELA UASG 160136.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 658800.00, liqRs: 0.00, empAliqRs: 658800.00 },
  { om: "Cmdo 9º Gpt", data: "15/08/26", ne: "160136000122026NE000136", descricao: "PETROBRAS DISTRIBUIDORA S.A., FORNECIMENTO DE DIESEL S10 E GASOLINA C PARA VIATURAS OPERACIONAIS.", pi: "PI-9GPTLOG-COT", nd: "339030", tipo: "O", acao: "2000", dias: 3, empRs: 1800000.00, liqRs: 1400000.00, empAliqRs: 400000.00 },
  { om: "9º B Mnt", data: "12/08/26", ne: "160136000122026NE000513", descricao: "AUTO PEÇAS CAMPO GRANDE, PEÇAS DE REPOSIÇÃO PARA VIATURAS MILITARIZADAS E OPERACIONAIS.", pi: "PI-9BMNT-PEC", nd: "339039", tipo: "O", acao: "2021", dias: 6, empRs: 1450000.00, liqRs: 1200000.00, empAliqRs: 250000.00 },
];

interface RpnpItem {
  om: string;
  uge: string;
  ne: string;
  descricao: string;
  favorecido: string;
  nd: string;
  pi: string;
  si: string;
  tipo: string;
  rpnpInsc: number;
  rpnpCanc: number;
  rpnpAliq: number;
}

const RPNP_DATA: RpnpItem[] = [
  { om: "9º GPT LOG", uge: "160136", ne: "160136000122025NE001468", descricao: "CMDO 9º GPT LOG, REQ 291 ALMOX SV AGUA E ESGOTO, 2025NC026172 DE 22 DEZ 2025, DA DGO, ND 339000 UGR 160073 PTRES 171397 PI I3DACSPAGES, CONTRATO 125/2022 DA UASG 160136. REFORCO 2025 NE 1014.", favorecido: "4089570000150 - AGUAS GUARIROBA SA", nd: "339039", pi: "I3DACSPAGES", si: "44 - SERVICOS DE AGUA, ESGOTO E RESIDUOS SOLIDOS", tipo: "E", rpnpInsc: 151929.27, rpnpCanc: 0.00, rpnpAliq: 151929.27 },
  { om: "9º GPT LOG", uge: "160136", ne: "160136000122025NE001470", descricao: "CMDO 9º GPT LOG, REQ 292/2025-ALMOX-ENERGIA ELETRICA, 2025NC026395 DE 22/12/2025, DA DGO, ND 339039, UGR 160073, PI I3DACSPENEL, CONTRATO 41/2025, UASG 160136.", favorecido: "17858631000149 - MATRIX COMERCIALIZADORA DE ENERGIA ELETRICA S/A", nd: "339039", pi: "I3DACSPENEL", si: "43 - SERVICOS DE ENERGIA ELETRICA", tipo: "E", rpnpInsc: 72908.60, rpnpCanc: 0.00, rpnpAliq: 72908.60 },
  { om: "9º GPT LOG", uge: "160136", ne: "160136000122025NE001293", descricao: "CMDO 9º GPT LOG, REQ 230 ALMOX CMDO SV FORNECIMENTO DE ENERGIA ELETRICA, 2025NC020468 DE 7 NOV 25, DA DGO, ND 339039, UGR 160073, PI I3DAFUNADOM, CONTRATO 41/2025 DA UASG 160136.", favorecido: "17858631000149 - MATRIX COMERCIALIZADORA DE ENERGIA ELETRICA S/A", nd: "339039", pi: "I3DACSPENEL", si: "43 - SERVICOS DE ENERGIA ELETRICA", tipo: "E", rpnpInsc: 107742.86, rpnpCanc: 0.00, rpnpAliq: 42234.25 },
  { om: "9º B SUP", uge: "160142", ne: "160136000122025NE000912", descricao: "9º B SUP, REQ 88 RPNP - AQUISIÇÃO DE CALÇADOS E FARDAMENTO MILITAR CLASSE II.", favorecido: "05888777000122 - CALÇADOS FORTE LTDA", nd: "339030", pi: "E6SUPLJA2QS", si: "30 - MATERIAL DE CONSUMO", tipo: "E", rpnpInsc: 620000.00, rpnpCanc: 0.00, rpnpAliq: 170000.00 },
];

interface SrpAtaItem {
  ugg: string;
  numCompra: string;
  fornecedor: string;
  numAtaAno: string;
  item: string;
  vigencia: string;
  valorUnt: number;
  percQtdEmp: string;
  qtdDisponivel: number;
  valorDispRs: number;
}

const SRP_ATA_DATA: SrpAtaItem[] = [
  { ugg: "160136", numCompra: "900012026", fornecedor: "57.562.366/0001-71 - TATSUOTECH COMERCIO LTDA", numAtaAno: "178/2026", item: "01 - ABRAÇADEIRA, MATERIAL NÁILON, COMPRIMENTO TOTAL 200 MM, LARGURA 3,60 MM", vigencia: "14/07/27", valorUnt: 5.90, percQtdEmp: "0,00%", qtdDisponivel: 50.00, valorDispRs: 295.00 },
  { ugg: "160136", numCompra: "900102026", fornecedor: "21.932.461/0001-72 - PREMIER PECAS E SERVICOS LTDA", numAtaAno: "128/2026", item: "01 - ACESSÓRIOS / EQUIPAMENTOS OFICINA MANUTENÇÃO, TIPO CARRO ESTEIRA, MATERIAL AÇO", vigencia: "14/05/27", valorUnt: 1.00, percQtdEmp: "0,00%", qtdDisponivel: 240000.00, valorDispRs: 240000.00 },
  { ugg: "160136", numCompra: "900052025", fornecedor: "18.933.268/0001-11 - LRS DISTRIBUIDORA DE ALIMENTOS LTDA", numAtaAno: "191/2025", item: "01 - AÇÚCAR, TIPO REFINADO, COLORAÇÃO BRANCA, PRAZO VALIDADE MÍNIMO 12 MESES", vigencia: "20/08/26", valorUnt: 3.90, percQtdEmp: "31,32%", qtdDisponivel: 41235.00, valorDispRs: 160816.50 },
  { ugg: "160136", numCompra: "900142026", fornecedor: "19.697.908/0001-24 - ACUCAR NUMERO UM S.A.", numAtaAno: "206/2026", item: "01 - AÇÚCAR, TIPO REFINADO, COLORAÇÃO BRANCA, PRAZO VALIDADE MÍNIMO 12 MESES", vigencia: "04/08/27", valorUnt: 3.50, percQtdEmp: "0,00%", qtdDisponivel: 40680.00, valorDispRs: 142380.00 },
  { ugg: "160136", numCompra: "900212025", fornecedor: "12.433.700/0001-59 - NUTRICELLI COMERCIO DE ALIMENTOS LTDA", numAtaAno: "54/2026", item: "01 - AÇÚCAR, TIPO REFINADO, COLORAÇÃO BRANCA, PRAZO VALIDADE MÍNIMO 12 MESES", vigencia: "26/02/27", valorUnt: 4.44, percQtdEmp: "0,00%", qtdDisponivel: 26700.00, valorDispRs: 118548.00 },
  { ugg: "160136", numCompra: "900232025", fornecedor: "60.504.688/0001-26 - APS COMERCIO E SERVICOS LTDA", numAtaAno: "12/2026", item: "01 - AÇUCAREIRO, MATERIAL AÇO INOXIDÁVEL CAPACIDADE 350 G, CARACTERÍSTICAS ADICIONAIS COM TAMPA E COLHER EM AÇO INOXIDÁVEL", vigencia: "27/01/27", valorUnt: 12.20, percQtdEmp: "0,00%", qtdDisponivel: 75.00, valorDispRs: 915.00 },
  { ugg: "160143", numCompra: "900532024", fornecedor: "28.857.335/0001-40 - MAXIMA DENTAL IMPORTACAO, EXPORTACAO E COMERCIO DE PRODUTOS", numAtaAno: "106/2025", item: "01 - ADESIVO DENTAL, TIPO FOTOPOLIMERIZÁVEL, COMPONENTES ADESIVO + PRIMER", vigencia: "26/09/26", valorUnt: 80.65, percQtdEmp: "4,47%", qtdDisponivel: 662.00, valorDispRs: 53390.30 },
];

export function CreditManagementClient() {
  const [activeSubpage, setActiveSubpage] = useState<string>("capa");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [filters, setFilters] = useState<CreditFilterOptions>({});

  const handleResetFilters = () => {
    setFilters({});
  };

  // Filtragem dinâmica de NCs de referência
  const filteredNCs = useMemo(() => {
    return NC_REFERENCIA_DATA.filter((item) => {
      if (filters.ugCode && !item.ncRef.includes(filters.ugCode) && !item.om.includes(filters.ugCode)) return false;
      if (filters.expenseNature && item.nd !== filters.expenseNature) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          item.ncRef.toLowerCase().includes(q) ||
          item.om.toLowerCase().includes(q) ||
          item.finalidade.toLowerCase().includes(q) ||
          item.pi.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filters]);

  // Filtragem dinâmica de NEs do exercício
  const filteredNEs = useMemo(() => {
    return NE_EXERCICIO_DATA.filter((item) => {
      if (filters.expenseNature && item.nd !== filters.expenseNature) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          item.ne.toLowerCase().includes(q) ||
          item.om.toLowerCase().includes(q) ||
          item.descricao.toLowerCase().includes(q) ||
          item.pi.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filters]);

  // Filtragem dinâmica de RPNPs
  const filteredRPNPs = useMemo(() => {
    return RPNP_DATA.filter((item) => {
      if (filters.ugCode && item.uge !== filters.ugCode) return false;
      if (filters.expenseNature && item.nd !== filters.expenseNature) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          item.ne.toLowerCase().includes(q) ||
          item.om.toLowerCase().includes(q) ||
          item.descricao.toLowerCase().includes(q) ||
          item.favorecido.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filters]);

  // Filtragem dinâmica de Pregões SRP
  const filteredSRP = useMemo(() => {
    return SRP_ATA_DATA.filter((item) => {
      if (filters.ugCode && item.ugg !== filters.ugCode) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        return (
          item.numAtaAno.toLowerCase().includes(q) ||
          item.fornecedor.toLowerCase().includes(q) ||
          item.item.toLowerCase().includes(q) ||
          item.numCompra.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filters]);

  return (
    <div className="space-y-6 pb-12">
      {/* Dynamic Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
            onClick={() => setIsGuideOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <BookOpen className="h-4 w-4 text-emerald-400" />
            <span>Guia Técnico (Outras OMs)</span>
          </button>

          <div className="text-right hidden sm:block border-l border-zinc-800 pl-3">
            <span className="text-xs text-zinc-500 block">Atualizado em</span>
            <span className="text-sm font-bold text-emerald-400">18/08/2026 09:40</span>
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
                  <span className="text-[10px] opacity-75">({filteredNCs.length})</span>
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
                  <span className="text-[10px] opacity-75">({filteredNEs.length})</span>
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
                  <span className="text-[10px] opacity-75">({filteredRPNPs.length})</span>
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
                  <span className="text-[10px] opacity-75">({filteredSRP.length})</span>
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
                  <span className="text-[10px] opacity-75">({filteredNCs.length})</span>
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
                  <span className="text-[10px] opacity-75">({filteredNEs.length})</span>
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
                  <span className="text-[10px] opacity-75">({filteredRPNPs.length})</span>
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
                </button>
              </div>
            </div>

            {/* MATRIZ DE COBERTURA MCL */}
            <div className="pt-2 border-t border-zinc-800">
              <button
                onClick={() => setActiveSubpage("matriz")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-between border ${
                  activeSubpage === "matriz"
                    ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm"
                    : "bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
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
              {/* Primary KPI Metrics Bar (Idêntico ao Power BI) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-zinc-400 font-semibold block uppercase">Provisão Atualizada (R$)</span>
                  <span className="text-2xl font-bold text-white block mt-1">R$ 43.306.816,72</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-zinc-400 font-semibold block uppercase">Despesa Empenhada (R$)</span>
                  <span className="text-2xl font-bold text-amber-400 block mt-1">R$ 34.295.503,93</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-zinc-400 font-semibold block uppercase">% Empenhado</span>
                  <span className="text-2xl font-bold text-emerald-400 block mt-1">79.19%</span>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 shadow-sm">
                  <span className="text-xs text-zinc-400 font-semibold block uppercase">Crédito Disponível (R$)</span>
                  <span className="text-2xl font-bold text-emerald-400 block mt-1">R$ 9.011.312,79</span>
                </div>
              </div>

              {/* Visual Display Table summary */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieIcon className="h-5 w-5 text-emerald-400" /> RESUMO GERAL DO FORTE LOGÍSTICO 2026
                </h3>
                <p className="text-xs text-zinc-400">Total de crédito disponível descentralizado e empenhado por OMRequisitante e Provedora.</p>
              </div>
            </div>
          )}

          {/* Subpage 2: Módulo Requisitante - NC(s) Referência */}
          {(activeSubpage === "req_nc" || activeSubpage === "rpcm_nc") && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              {/* Header Cards do Power BI */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-zinc-800 pb-4">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Provisão Atualizada (R$)</span>
                  <span className="text-lg font-bold text-white">R$ 43.306.816,72</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Despesa Empenhada (R$)</span>
                  <span className="text-lg font-bold text-amber-400">R$ 34.295.503,93</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">% Empenhado</span>
                  <span className="text-lg font-bold text-emerald-400">79.19%</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 bg-emerald-500/10">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Crédito Disponível (R$)</span>
                  <span className="text-lg font-bold text-emerald-400">R$ 9.011.312,79</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-emerald-400" />
                  NOTAS DE CRÉDITO REFERÊNCIA ({filteredNCs.length} Registros)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Ação</th>
                      <th className="py-2.5 px-3">NC Referência</th>
                      <th className="py-2.5 px-3">RO</th>
                      <th className="py-2.5 px-3 max-w-xs">Finalidade</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3">Prazo Emp</th>
                      <th className="py-2.5 px-3 text-right">Prov Atlzd (R$)</th>
                      <th className="py-2.5 px-3 text-right">Cred Disp (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                    {filteredNCs.map((nc, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">{nc.om}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{nc.data}</td>
                        <td className="py-2.5 px-3">{nc.acao}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{nc.ncRef}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{nc.ro}</td>
                        <td className="py-2.5 px-3 font-sans max-w-xs text-[11px] truncate" title={nc.finalidade}>{nc.finalidade}</td>
                        <td className="py-2.5 px-3 text-amber-400">{nc.pi}</td>
                        <td className="py-2.5 px-3">{nc.nd}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{nc.prazoEmp}</td>
                        <td className="py-2.5 px-3 text-right">{formatCurrency(nc.provAtlz)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatCurrency(nc.credDisp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 3: Módulo Requisitante - NE(s) do Exercício Corrente */}
          {(activeSubpage === "req_ne" || activeSubpage === "rpcm_ne") && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              {/* Header Cards do Power BI */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-zinc-800 pb-4">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Provisão Atualizada (R$)</span>
                  <span className="text-lg font-bold text-white">R$ 43.306.816,72</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Despesa Liquidada (R$)</span>
                  <span className="text-lg font-bold text-emerald-400">R$ 18.600.056,39</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">% Liquidado</span>
                  <span className="text-lg font-bold text-amber-400">42.95%</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 bg-amber-500/10">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold block">Empenhado a Liquidar (R$)</span>
                  <span className="text-lg font-bold text-amber-400">R$ 15.695.447,54</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-400" />
                  NE(s) DO EXERCÍCIO CORRENTE ({filteredNEs.length} Registros)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
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
                      <th className="py-2.5 px-3 text-right">Emp a Liq (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                    {filteredNEs.map((ne, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">{ne.om}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{ne.data}</td>
                        <td className="py-2.5 px-3 text-amber-400 font-bold">{ne.ne}</td>
                        <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]" title={ne.descricao}>{ne.descricao}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{ne.pi}</td>
                        <td className="py-2.5 px-3">{ne.nd}</td>
                        <td className="py-2.5 px-3">{ne.tipo}</td>
                        <td className="py-2.5 px-3">{ne.acao}</td>
                        <td className="py-2.5 px-3 text-center">{ne.dias}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">{formatCurrency(ne.empRs)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400">{formatCurrency(ne.liqRs)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{formatCurrency(ne.empAliqRs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 4: Restos a Pagar Não Processados (RPNPs) */}
          {(activeSubpage === "req_rpnp" || activeSubpage === "rpcm_rpnp") && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              {/* Header Cards do Power BI */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-zinc-800 pb-4">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">RPNP Insc + reinsc (R$)</span>
                  <span className="text-lg font-bold text-white">R$ 8.707.966,70</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">RPNP Liquidado (R$)</span>
                  <span className="text-lg font-bold text-emerald-400">R$ 8.343.286,49</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">% RPNP Liquidado</span>
                  <span className="text-lg font-bold text-emerald-400">95.81%</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 bg-amber-500/10">
                  <span className="text-[10px] text-amber-400 uppercase font-semibold block">RPNP a Liquidar (R$)</span>
                  <span className="text-lg font-bold text-amber-400">R$ 364.294,41</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="h-5 w-5 text-emerald-400" />
                  RESTOS A PAGAR NÃO PROCESSADOS ({filteredRPNPs.length} Registros)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">UGE</th>
                      <th className="py-2.5 px-3">NE</th>
                      <th className="py-2.5 px-3 max-w-sm">Descrição</th>
                      <th className="py-2.5 px-3 max-w-xs">Favorecido</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">SI</th>
                      <th className="py-2.5 px-3 text-right">RPNP Insc (R$)</th>
                      <th className="py-2.5 px-3 text-right">RPNP Canc (R$)</th>
                      <th className="py-2.5 px-3 text-right">RPNP a Liq (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                    {filteredRPNPs.map((r, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">{r.om}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{r.uge}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{r.ne}</td>
                        <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]" title={r.descricao}>{r.descricao}</td>
                        <td className="py-2.5 px-3 font-sans max-w-xs text-[11px]" title={r.favorecido}>{r.favorecido}</td>
                        <td className="py-2.5 px-3">{r.nd}</td>
                        <td className="py-2.5 px-3 text-amber-400">{r.pi}</td>
                        <td className="py-2.5 px-3 text-zinc-400 max-w-[150px] truncate" title={r.si}>{r.si}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{formatCurrency(r.rpnpInsc)}</td>
                        <td className="py-2.5 px-3 text-right text-zinc-400">{formatCurrency(r.rpnpCanc)}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">{formatCurrency(r.rpnpAliq)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpage 5: Pregões SRP (Atas de Registro de Preço) */}
          {activeSubpage === "req_srp" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              {/* Header Cards do Power BI */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-zinc-800 pb-4">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Nº Pregões Considerados</span>
                  <span className="text-lg font-bold text-white">51</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Valor Homologado (R$)</span>
                  <span className="text-lg font-bold text-white">R$ 145.947.727,74</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">Valor Empenhado (R$)</span>
                  <span className="text-lg font-bold text-amber-400">R$ 28.331.047,34</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 bg-emerald-500/10">
                  <span className="text-[10px] text-emerald-400 uppercase font-semibold block">Valor Disponível (R$)</span>
                  <span className="text-lg font-bold text-emerald-400">R$ 117.616.680,40</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-emerald-400" />
                  ANÁLISE DE ITENS VIGENTES DE PREGÃO ({filteredSRP.length} Registros)
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">UGG</th>
                      <th className="py-2.5 px-3">Nº Compra</th>
                      <th className="py-2.5 px-3 max-w-xs">Fornecedor</th>
                      <th className="py-2.5 px-3">Nº Ata/Ano</th>
                      <th className="py-2.5 px-3 max-w-sm">Item</th>
                      <th className="py-2.5 px-3">Vigência</th>
                      <th className="py-2.5 px-3 text-right">Valor Unt (R$)</th>
                      <th className="py-2.5 px-3 text-center">% Qtd Emp</th>
                      <th className="py-2.5 px-3 text-right">Qtd Disponível</th>
                      <th className="py-2.5 px-3 text-right">Valor Disp (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                    {filteredSRP.map((s, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">{s.ugg}</td>
                        <td className="py-2.5 px-3 text-amber-400">{s.numCompra}</td>
                        <td className="py-2.5 px-3 font-sans max-w-xs text-[11px]" title={s.fornecedor}>{s.fornecedor}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{s.numAtaAno}</td>
                        <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]" title={s.item}>{s.item}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{s.vigencia}</td>
                        <td className="py-2.5 px-3 text-right">{formatCurrency(s.valorUnt)}</td>
                        <td className="py-2.5 px-3 text-center text-amber-400">{s.percQtdEmp}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{s.qtdDisponivel.toLocaleString("pt-BR")}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatCurrency(s.valorDispRs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Subpages Módulo Meta */}
          {activeSubpage === "meta_exercicio" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" /> MÓDULO META — EXERCÍCIO 2026
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400 uppercase font-semibold block">Meta de Execução (R$)</span>
                  <span className="text-xl font-bold text-white">R$ 43.306.816,72</span>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400 uppercase font-semibold block">Realizado em Empenho (R$)</span>
                  <span className="text-xl font-bold text-amber-400">R$ 34.295.503,93</span>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400 uppercase font-semibold block">% Atingido</span>
                  <span className="text-xl font-bold text-emerald-400">79.19%</span>
                </div>
              </div>
            </div>
          )}

          {activeSubpage === "meta_rpnp" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-400" /> MÓDULO META — RESTOS A PAGAR (RPNP)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400 uppercase font-semibold block">Meta RPNP (R$)</span>
                  <span className="text-xl font-bold text-white">R$ 8.707.966,70</span>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400 uppercase font-semibold block">Liquidado (R$)</span>
                  <span className="text-xl font-bold text-emerald-400">R$ 8.343.286,49</span>
                </div>
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800">
                  <span className="text-xs text-zinc-400 uppercase font-semibold block">% Liquidado</span>
                  <span className="text-xl font-bold text-emerald-400">95.81%</span>
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
