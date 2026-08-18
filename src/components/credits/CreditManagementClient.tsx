"use client";

import React, { useState } from "react";
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
  RefreshCw,
  Calendar,
} from "lucide-react";
import { TechnicalGuideModal } from "./TechnicalGuideModal";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

// ==========================================
// DATASETS REAIS INTEGRADOS DO FORTE LOGÍSTICO (SLIDES POWER BI)
// ==========================================

const NC_REFERENCIA_DATA = [
  { om: "9º B SAU", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424567A", ro: "160505000012026RO023950", finalidade: "ATENDE ADITAMENTO 4A BOL DGP 079_10 JUL 2026_CURSOS FAVORECIDO CAP BRUNO JOS CARDOSO MENDES 01689313544 REFERENTE PLANEJAMENTO SIPEO 91235", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", provAtlz: 35714.08, credDisp: 35714.08 },
  { om: "18º B TRNP", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424611A", ro: "160505000012026RO023856", finalidade: "ATENDE ADITAMENTO 2G BOL DGP 082_17 JUL 26_QSG FAVORECIDO 1 TEN FELIPE HANSEN POLESI 42205154885 REFERENTE PLANEJAMENTO SIPEO 91436", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", provAtlz: 61227.20, credDisp: 61227.20 },
  { om: "CIA CMDO", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424658A", ro: "160505000012026RO023869", finalidade: "ATENDE ADITAMENTO 3F BOL DGP 082_17 JUL 2026_PRA AS FAVORECIDO S TEN ERASMO MARCIO DA COSTA 02932035630 REFERENTE PLANEJAMENTO SIPEO 91671", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", provAtlz: 29777.54, credDisp: 29777.54 },
  { om: "9º B SAU", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424567B", ro: "160505000012026RO023950", finalidade: "ATENDE ADITAMENTO 4A BOL DGP 079_10 JUL 2026_CURSOS FAVORECIDO CAP BRUNO JOS CARDOSO MENDES 01689313544 REFERENTE PLANEJAMENTO SIPEO 91235", pi: "D6PEINDMV1T", nd: "339093", prazoEmp: "19/08/26", provAtlz: 1395.52, credDisp: 1395.52 },
  { om: "18º B TRNP", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424611B", ro: "160505000012026RO023856", finalidade: "ATENDE ADITAMENTO 2G BOL DGP 082_17 JUL 26_QSG FAVORECIDO 1 TEN FELIPE HANSEN POLESI 42205154885 REFERENTE PLANEJAMENTO", pi: "D6PEINDMV1T", nd: "339093", prazoEmp: "19/08/26", provAtlz: 18518.14, credDisp: 18518.14 },
];

const NE_EXERCICIO_DATA = [
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000976", descricao: "9º B SUP, REQ 83 CLI - AQUISIÇÃO DE FRALDINHA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90014/26GERENCIADO PELA UASG 160136-9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 913497.00, liqRs: 0.00, empAliqRs: 913497.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000977", descricao: "9º B SUP, REQ 90 CLI - AQUISIÇÃO DE FILÉ DE TILÁPIA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90021/25 GERENCIADO PELA UASG 160136 - 9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 729800.00, liqRs: 0.00, empAliqRs: 729800.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000978", descricao: "9º B SUP, REQ 91 CLI - AQUISIÇÃO DE FILÉ DE TILÁPIA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90021/25 GERENCIADO PELA UASG 160136 - 9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 729800.00, liqRs: 0.00, empAliqRs: 729800.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000979", descricao: "9º B SUP, REQ 82 CLI - AQUISIÇÃO DE FRALDINHA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90014/26GERENCIADO PELA UASG 160136-9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 885000.00, liqRs: 0.00, empAliqRs: 885000.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000980", descricao: "9º B SUP, REQ 81 CLI - AQUISIÇÃO DE CONTRA FILÉ, 2026NC412729, PREGÃO ELETRÔNICO Nº 90021/25 GERENCIADO PELA UASG 160136-9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 991652.50, liqRs: 0.00, empAliqRs: 991652.50 },
];

const RPNP_DATA = [
  { om: "9º GPT LOG", uge: "160136", ne: "160136000122025NE001468", descricao: "CMDO 9º GPT LOG, REQ 291 ALMOX SV AGUA E ESGOTO, 2025NC026172 DE 22 DEZ 2025, DA DGO, ND 339000 UGR 160073 PTRES 171397 PI I3DACSPAGES, CONTRATO 125/2022 DA UASG 160136. REFORCO 2025 NE 1014.", favorecido: "4089570000150 - AGUAS GUARIROBA SA", nd: "339039", pi: "I3DACSPAGES", si: "44 - SERVICOS DE AGUA, ESGOTO E RESIDUOS SOLIDOS", tipo: "E", rpnpInsc: 151929.27, rpnpCanc: 0.00, rpnpAliq: 151929.27 },
  { om: "9º GPT LOG", uge: "160136", ne: "160136000122025NE001470", descricao: "CMDO 9º GPT LOG, REQ 292/2025-ALMOX-ENERGIA ELETRICA, 2025NC026395 DE 22/12/2025, DA DGO, ND 339039, UGR 160073, PI I3DACSPENEL, CONTRATO 41/2025, UASG 160136.", favorecido: "17858631000149 - MATRIX COMERCIALIZADORA DE ENERGIA ELETRICA S/A", nd: "339039", pi: "I3DACSPENEL", si: "43 - SERVICOS DE ENERGIA ELETRICA", tipo: "E", rpnpInsc: 72908.60, rpnpCanc: 0.00, rpnpAliq: 72908.60 },
];

const SRP_ATA_DATA = [
  { ugg: "160136", numCompra: "900012026", fornecedor: "57.562.366/0001-71 - TATSUOTECH COMERCIO LTDA", numAtaAno: "178/2026", item: "01 - ABRAÇADEIRA, MATERIAL NÁILON, COMPRIMENTO TOTAL 200 MM, LARGURA 3,60 MM", vigencia: "14/07/27", valorUnt: 5.90, percQtdEmp: "0,00%", qtdDisponivel: 50.00, valorDispRs: 295.00 },
  { ugg: "160136", numCompra: "900102026", fornecedor: "21.932.461/0001-72 - PREMIER PECAS E SERVICOS LTDA", numAtaAno: "128/2026", item: "01 - ACESSÓRIOS / EQUIPAMENTOS OFICINA MANUTENÇÃO, TIPO CARRO ESTEIRA, MATERIAL AÇO", vigencia: "14/05/27", valorUnt: 1.00, percQtdEmp: "0,00%", qtdDisponivel: 240000.00, valorDispRs: 240000.00 },
];

const RPCM_NC_DATA = [
  { om: "9º B SUP", data: "10/08/26", uge: "160136", ncRef: "160504000012026NC412729", pi: "E6SUPLJA2QS", nd: "339030", prazoEmp: "30/10/26", percEmp: "51,27%", credDisp: 7680663.92, justificativa: "", prevEmp: "" },
  { om: "9º B MNT", data: "10/08/26", uge: "160136", ncRef: "160504000012026NC412605", pi: "E6SUPLJA1QR", nd: "339030", prazoEmp: "30/10/26", percEmp: "0,00%", credDisp: 203742.00, justificativa: "Até final de Agosto será empenhado 100%", prevEmp: "" },
];

const RPCM_NE_DATA = [
  { om: "9º B SAU", diaEmissao: "02/02/26", ne: "167136000012026NE000001", pi: "D8SAFUNADOM", nd: "339039", tipo: "G", acao: "2004", resultadoLei: "PRIMARIO OBRIGATORIO", dias: 197, empAliqRs: 3036.00, justificativa: "Empenho Global, serviços ar condicionado. 02 NF valores de 850,00 e 980,00 já no Almox.", prazoLiq: "" },
  { om: "9º GPT LOG", diaEmissao: "03/02/26", ne: "160136000012026NE000026", pi: "I3DAFUNCOPI", nd: "339040", tipo: "G", acao: "2000", resultadoLei: "PRIMARIO DISCRICIONARIO", dias: 196, empAliqRs: 12978.65, justificativa: "Contrato continuado: PRO mensal no valor de R$ 4060,00", prazoLiq: "OUT 26" },
];

const RPCM_RPNP_DATA = [
  { om: "9º GPT LOG", ne: "160136000012025NE001468", favorecido: "4089570000150 - AGUAS GUARIROBA SA", nd: "339039", pi: "I3DACSPAGES", si: "44 SERVICOS DE AGUA, ESGOTO E RESIDUOS SOLIDOS", tipo: "E", rpnpAliq: 151929.27, justificativa: "Contrato continuado de fornecimento de água, NF liquidada mensalmente conforme PRO R$ 35.000,00", prazoLiq: "DEZ/26" },
];

export function CreditManagementClient() {
  const [activeSubpage, setActiveSubpage] = useState<string>("req_nc");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [expandedOm, setExpandedOm] = useState<string | null>("9º B SUP");

  return (
    <div className="space-y-6 pb-12 bg-[#121316] text-zinc-100 p-4 md:p-6 rounded-2xl min-h-screen">
      {/* Top Header Banner */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Tesouro Gerencial · 9º Gpt Log 2026
            </span>
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6 text-emerald-400" />
            PAINEL DE EXECUÇÃO ORÇAMENTÁRIA DO FORTE LOGÍSTICO 2026
          </h1>
        </div>

        <button
          onClick={() => setIsGuideOpen(true)}
          className="px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2"
        >
          <BookOpen className="h-4 w-4" />
          <span>Guia Técnico de Integração</span>
        </button>
      </div>

      {/* Main Grid: Sidebar + Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Power BI Menu Lateral */}
        <div className="lg:col-span-3 space-y-3 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-lg h-fit">
          <div className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider border-b border-zinc-800 pb-2 mb-3">
            PAINEL POWER BI (10 TELAS)
          </div>

          <button
            onClick={() => setActiveSubpage("capa")}
            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between border ${
              activeSubpage === "capa" ? "bg-emerald-500 text-zinc-950 border-emerald-400" : "bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <span className="flex items-center gap-2"><PieIcon className="h-4 w-4" /> Capa / Painel Geral</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* MÓDULO REQUISITANTE */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-emerald-400 uppercase tracking-wider px-1 pt-2">MÓDULO REQUISITANTE</div>
            <div className="space-y-1 pl-2 border-l-2 border-emerald-500/40">
              <button onClick={() => setActiveSubpage("req_nc")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "req_nc" ? "bg-emerald-500 text-zinc-950 font-extrabold" : "text-zinc-300 hover:bg-zinc-800"}`}>
                NC(s) - Notas de Crédito
              </button>
              <button onClick={() => setActiveSubpage("req_ne")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "req_ne" ? "bg-emerald-500 text-zinc-950 font-extrabold" : "text-zinc-300 hover:bg-zinc-800"}`}>
                NE(s) - Notas de Empenho
              </button>
              <button onClick={() => setActiveSubpage("req_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "req_rpnp" ? "bg-emerald-500 text-zinc-950 font-extrabold" : "text-zinc-300 hover:bg-zinc-800"}`}>
                RPNPs - Restos a Pagar
              </button>
              <button onClick={() => setActiveSubpage("req_srp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "req_srp" ? "bg-emerald-500 text-zinc-950 font-extrabold" : "text-zinc-300 hover:bg-zinc-800"}`}>
                Pregões SRP (Atas)
              </button>
            </div>
          </div>

          {/* MÓDULO RPCM */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-amber-400 uppercase tracking-wider px-1 pt-2">MÓDULO RPCM (PROVEDOR)</div>
            <div className="space-y-1 pl-2 border-l-2 border-amber-500/40">
              <button onClick={() => setActiveSubpage("rpcm_nc")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "rpcm_nc" ? "bg-amber-500 text-zinc-950 font-extrabold" : "text-zinc-300 hover:bg-zinc-800"}`}>
                NC(s) - Créditos RPCM
              </button>
              <button onClick={() => setActiveSubpage("rpcm_ne")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "rpcm_ne" ? "bg-amber-500 text-zinc-950 font-extrabold" : "text-zinc-300 hover:bg-zinc-800"}`}>
                NE(s) - Empenhos RPCM
              </button>
              <button onClick={() => setActiveSubpage("rpcm_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "rpcm_rpnp" ? "bg-amber-500 text-zinc-950 font-extrabold" : "text-zinc-300 hover:bg-zinc-800"}`}>
                RPNPs - Restos a Pagar RPCM
              </button>
            </div>
          </div>

          {/* MÓDULO META */}
          <div className="space-y-1">
            <div className="text-[10px] font-black text-blue-400 uppercase tracking-wider px-1 pt-2">MÓDULO META</div>
            <div className="space-y-1 pl-2 border-l-2 border-blue-500/40">
              <button onClick={() => setActiveSubpage("meta_exercicio")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "meta_exercicio" ? "bg-blue-500 text-white font-extrabold" : "text-zinc-300 hover:bg-zinc-800"}`}>
                Do Exercício (2026)
              </button>
              <button onClick={() => setActiveSubpage("meta_rpnp")} className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeSubpage === "meta_rpnp" ? "bg-blue-500 text-white font-extrabold" : "text-zinc-300 hover:bg-zinc-800"}`}>
                De RPNP (Restos a Pagar)
              </button>
            </div>
          </div>
        </div>

        {/* Canvas da Tela Selecionada (Com visualização fiel ao Power BI) */}
        <div className="lg:col-span-9 space-y-6">
          {/* Controls Bar (Filtros + Período Slider idêntico ao Power BI) */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold hover:bg-zinc-700">
                Exibir filtros
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold hover:bg-zinc-700">
                NCs Referência
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-400 text-xs font-bold hover:bg-zinc-700">
                Limpar filtros
              </button>
              <button className="px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold hover:bg-zinc-700">
                Todas as NC(s)
              </button>
            </div>

            {/* Slider de Período */}
            <div className="flex items-center gap-3 bg-zinc-950 px-4 py-2 rounded-xl border border-zinc-800 text-xs">
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span className="text-zinc-400 font-medium">Período:</span>
              <span className="font-mono text-white font-bold">08/01/2026</span>
              <div className="w-24 h-1.5 bg-zinc-700 rounded-full relative mx-1">
                <div className="absolute left-0 right-0 top-0 bottom-0 bg-emerald-500 rounded-full" />
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow" />
              </div>
              <span className="font-mono text-white font-bold">17/08/2026</span>
            </div>
          </div>

          {/* SLIDE 2: Módulo Requisitante - NC(s) Referência (Visual idêntico ao Print 1 do Power BI) */}
          {activeSubpage === "req_nc" && (
            <div className="space-y-5">
              {/* Header Cards do Power BI */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                {/* Card Azul: Provisão e Despesa */}
                <div className="md:col-span-5 bg-gradient-to-br from-blue-900/40 to-blue-950/60 border border-blue-800/60 rounded-2xl p-4 flex flex-col justify-between shadow-lg">
                  <div>
                    <span className="text-xl font-extrabold text-white block">43.306.816,72</span>
                    <span className="text-[11px] text-blue-300 font-medium">Provisão atualizada (R$)</span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-800/40">
                    <span className="text-xl font-extrabold text-blue-200 block">34.295.503,93</span>
                    <span className="text-[11px] text-blue-300 font-medium">Despesa empenhada (R$)</span>
                  </div>
                </div>

                {/* Card Gauge % Empenhado */}
                <div className="md:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center shadow-lg relative">
                  <span className="text-xs font-bold text-zinc-400 uppercase mb-2">% Empenhado</span>
                  <div className="relative flex items-center justify-center">
                    <div className="w-28 h-14 border-t-8 border-l-8 border-r-8 border-emerald-500 rounded-t-full flex items-end justify-center pb-1">
                      <span className="text-xl font-black text-white">79.19%</span>
                    </div>
                  </div>
                </div>

                {/* Card Preto de Crédito Disponível */}
                <div className="md:col-span-3 bg-black border border-zinc-800 rounded-2xl p-5 flex flex-col items-center justify-center text-center shadow-xl">
                  <span className="text-3xl font-black text-white tracking-tight">9,01 Mi</span>
                  <span className="text-xs text-zinc-400 font-semibold mt-1">Credito disponível (R$)</span>
                </div>
              </div>

              {/* Tabela de Notas de Crédito Referência (Estilo Power BI com fundo Claro e Coluna Preta Highlight) */}
              <div className="bg-white text-zinc-900 rounded-2xl p-4 shadow-xl border border-zinc-300">
                <div className="text-center font-black text-base uppercase tracking-wider py-2 border-b border-zinc-200 mb-3 text-zinc-900">
                  NOTAS DE CRÉDITO REFERÊNCIA
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead className="bg-zinc-100 text-zinc-700 font-extrabold border-b border-zinc-300 uppercase">
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
                        <th className="py-2.5 px-3 text-right bg-black text-white font-extrabold">CRED DISP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono text-zinc-800">
                      {NC_REFERENCIA_DATA.map((nc, idx) => (
                        <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                          <td className="py-2.5 px-3 font-bold text-zinc-900">{nc.om}</td>
                          <td className="py-2.5 px-3 text-zinc-600">{nc.data}</td>
                          <td className="py-2.5 px-3">{nc.acao}</td>
                          <td className="py-2.5 px-3 font-bold text-zinc-900">{nc.ncRef}</td>
                          <td className="py-2.5 px-3 text-zinc-600">{nc.ro}</td>
                          <td className="py-2.5 px-3 font-sans max-w-xs text-[11px] leading-tight text-zinc-700" title={nc.finalidade}>{nc.finalidade}</td>
                          <td className="py-2.5 px-3 font-bold text-zinc-800">{nc.pi}</td>
                          <td className="py-2.5 px-3">{nc.nd}</td>
                          <td className="py-2.5 px-3 text-center text-purple-700 font-bold flex items-center justify-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-purple-600" /> {nc.prazoEmp}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(nc.provAtlz)}</td>
                          <td className="py-2.5 px-3 text-right bg-black text-white font-black">{formatCurrency(nc.credDisp)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-zinc-100 font-extrabold border-t-2 border-zinc-400">
                      <tr>
                        <td colSpan={9} className="py-3 px-3 uppercase text-zinc-900">Total</td>
                        <td className="py-3 px-3 text-right font-mono text-zinc-900">43.306.816,72</td>
                        <td className="py-3 px-3 text-right bg-black text-white font-mono font-black text-sm">9.011.312,79</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 3: NE(s) Exercício Corrente */}
          {activeSubpage === "req_ne" && (
            <div className="bg-white text-zinc-900 rounded-2xl p-5 shadow-xl border border-zinc-300 space-y-4">
              <div className="text-center font-black text-base uppercase py-2 border-b border-zinc-200">
                NE(s) DO EXERCÍCIO CORRENTE
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-100 text-zinc-700 font-extrabold border-b border-zinc-300 uppercase">
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
                      <th className="py-2.5 px-3 text-right bg-black text-white font-black">Emp a liq (R$)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono text-zinc-800">
                    {NE_EXERCICIO_DATA.map((ne, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900">{ne.om}</td>
                        <td className="py-2.5 px-3 text-zinc-600">{ne.data}</td>
                        <td className="py-2.5 px-3 font-bold text-blue-700">{ne.ne}</td>
                        <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]" title={ne.descricao}>{ne.descricao}</td>
                        <td className="py-2.5 px-3 font-bold">{ne.pi}</td>
                        <td className="py-2.5 px-3">{ne.nd}</td>
                        <td className="py-2.5 px-3">{ne.tipo}</td>
                        <td className="py-2.5 px-3">{ne.acao}</td>
                        <td className="py-2.5 px-3 text-center">{ne.dias}</td>
                        <td className="py-2.5 px-3 text-right font-medium">{formatCurrency(ne.empRs)}</td>
                        <td className="py-2.5 px-3 text-right text-emerald-700 font-bold">{formatCurrency(ne.liqRs)}</td>
                        <td className="py-2.5 px-3 text-right bg-black text-white font-black">{formatCurrency(ne.empAliqRs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 7: RPCM NE(s) Exercício Corrente */}
          {activeSubpage === "rpcm_ne" && (
            <div className="bg-white text-zinc-900 rounded-2xl p-5 shadow-xl border border-zinc-300 space-y-4">
              <div className="text-center font-black text-base uppercase py-2 border-b border-zinc-200">
                RPCM - NE(s) DO EXERCÍCIO CORRENTE
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-100 text-zinc-700 font-extrabold border-b border-zinc-300 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">Dia emissão</th>
                      <th className="py-2.5 px-3">NE</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Ação</th>
                      <th className="py-2.5 px-3">Resultado Lei</th>
                      <th className="py-2.5 px-3 text-center">Dias</th>
                      <th className="py-2.5 px-3 text-right bg-black text-white font-black">Emp a liq (R$)</th>
                      <th className="py-2.5 px-3 max-w-sm">Justificativa</th>
                      <th className="py-2.5 px-3">Prazo Liq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 font-mono text-zinc-800">
                    {RPCM_NE_DATA.map((ne, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-zinc-900">{ne.om}</td>
                        <td className="py-2.5 px-3 text-zinc-600">{ne.diaEmissao}</td>
                        <td className="py-2.5 px-3 font-bold text-blue-700">{ne.ne}</td>
                        <td className="py-2.5 px-3 font-bold">{ne.pi}</td>
                        <td className="py-2.5 px-3">{ne.nd}</td>
                        <td className="py-2.5 px-3">{ne.tipo}</td>
                        <td className="py-2.5 px-3">{ne.acao}</td>
                        <td className="py-2.5 px-3 font-sans text-[10px]">{ne.resultadoLei}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-red-600">{ne.dias}</td>
                        <td className="py-2.5 px-3 text-right bg-black text-white font-black">{formatCurrency(ne.empAliqRs)}</td>
                        <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]">{ne.justificativa}</td>
                        <td className="py-2.5 px-3 text-zinc-600">{ne.prazoLiq || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 9: Módulo Meta Do Exercício */}
          {activeSubpage === "meta_exercicio" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <button className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs">
                  CLIQUE PARA VISUALIZAR AS OMVs do 9º Gpt Log (UG 160136 e 167136)
                </button>
                <button className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 font-bold text-xs">
                  CLIQUE PARA VISUALIZAR O 9º B SUP (UG 160142 e 167142)
                </button>
              </div>

              <div className="bg-white text-zinc-900 p-4 rounded-2xl border border-zinc-300 space-y-3">
                <div className="text-center font-black text-sm uppercase py-1 border-b border-zinc-200">
                  Execução orçamentária 9º Gpt Log (UG 160136 e 167136)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-100 text-zinc-700 font-extrabold border-b border-zinc-300 uppercase">
                      <tr>
                        <th className="py-2 px-3">OM/Ação/PI/ND</th>
                        <th className="py-2 px-3 text-right">Prov Atualizada</th>
                        <th className="py-2 px-3 text-right">Desp emp</th>
                        <th className="py-2 px-3 text-center">% Emp</th>
                        <th className="py-2 px-3 text-right">Liq</th>
                        <th className="py-2 px-3 text-center">% Liq</th>
                        <th className="py-2 px-3 text-right bg-black text-white font-black">Emp A liquidar</th>
                        <th className="py-2 px-3 text-right bg-black text-white font-black">Cred disponível</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-mono">
                      <tr onClick={() => setExpandedOm(expandedOm === "9º B SUP" ? null : "9º B SUP")} className="hover:bg-zinc-50 cursor-pointer">
                        <td className="py-2.5 px-3 font-bold text-zinc-900 flex items-center gap-2">
                          {expandedOm === "9º B SUP" ? <ChevronDown className="h-4 w-4 text-blue-600" /> : <ChevronRight className="h-4 w-4 text-zinc-400" />}
                          9º B SUP
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold">36.435.380,90</td>
                        <td className="py-2.5 px-3 text-right font-bold">28.414.510,38</td>
                        <td className="py-2.5 px-3 text-center font-bold text-emerald-700">77,99%</td>
                        <td className="py-2.5 px-3 text-right font-bold">14.926.419,26</td>
                        <td className="py-2.5 px-3 text-center font-bold text-blue-700">40,97%</td>
                        <td className="py-2.5 px-3 text-right bg-black text-white font-black">13.488.091,12</td>
                        <td className="py-2.5 px-3 text-right bg-black text-white font-black">8.020.870,52</td>
                      </tr>
                    </tbody>
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
