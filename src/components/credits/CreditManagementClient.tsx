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
  Layers,
  Filter,
} from "lucide-react";
import { CreditFilterBar } from "./CreditFilterBar";
import { TechnicalGuideModal } from "./TechnicalGuideModal";
import { CreditFilterOptions } from "@/modules/credits/types";

const formatCurrency = (val: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);

// ==========================================
// DATASETS REAIS INTEGRADOS DO FORTE LOGÍSTICO (10 SLIDES POWER BI)
// ==========================================

// SLIDE 2: REQUISITANTE - NC REFERÊNCIA
const NC_REFERENCIA_DATA = [
  { om: "9º B SAU", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424567A", ro: "160505000012026RO023950", finalidade: "ATENDE ADITAMENTO 4A BOL DGP 079_10 JUL 2026_CURSOS FAVORECIDO CAP BRUNO JOS CARDOSO MENDES 01689313544 REFERENTE PLANEJAMENTO SIPEO 91235", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", provAtlz: 35714.08, credDisp: 35714.08 },
  { om: "18º B TRNP", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424611A", ro: "160505000012026RO023856", finalidade: "ATENDE ADITAMENTO 2G BOL DGP 082_17 JUL 26_QSG FAVORECIDO 1 TEN FELIPE HANSEN POLESI 42205154885 REFERENTE PLANEJAMENTO SIPEO 91436", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", provAtlz: 61227.20, credDisp: 61227.20 },
  { om: "CIA CMDO", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424658A", ro: "160505000012026RO023869", finalidade: "ATENDE ADITAMENTO 3F BOL DGP 082_17 JUL 2026_PRA AS FAVORECIDO S TEN ERASMO MARCIO DA COSTA 02932035630 REFERENTE PLANEJAMENTO SIPEO 91671", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", provAtlz: 29777.54, credDisp: 29777.54 },
  { om: "9º B SAU", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424567B", ro: "160505000012026RO023950", finalidade: "ATENDE ADITAMENTO 4A BOL DGP 079_10 JUL 2026_CURSOS FAVORECIDO CAP BRUNO JOS CARDOSO MENDES 01689313544 REFERENTE PLANEJAMENTO SIPEO 91235", pi: "D6PEINDMV1T", nd: "339093", prazoEmp: "19/08/26", provAtlz: 1395.52, credDisp: 1395.52 },
  { om: "18º B TRNP", data: "17/08/26", acao: "2120", ncRef: "160505000012026NC424611B", ro: "160505000012026RO023856", finalidade: "ATENDE ADITAMENTO 2G BOL DGP 082_17 JUL 26_QSG FAVORECIDO 1 TEN FELIPE HANSEN POLESI 42205154885 REFERENTE PLANEJAMENTO", pi: "D6PEINDMV1T", nd: "339093", prazoEmp: "19/08/26", provAtlz: 18518.14, credDisp: 18518.14 },
];

// SLIDE 3: REQUISITANTE - NE(S) DO EXERCÍCIO CORRENTE
const NE_EXERCICIO_DATA = [
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000976", descricao: "9º B SUP, REQ 83 CLI - AQUISIÇÃO DE FRALDINHA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90014/26GERENCIADO PELA UASG 160136-9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 913497.00, liqRs: 0.00, empAliqRs: 913497.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000977", descricao: "9º B SUP, REQ 90 CLI - AQUISIÇÃO DE FILÉ DE TILÁPIA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90021/25 GERENCIADO PELA UASG 160136 - 9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 729800.00, liqRs: 0.00, empAliqRs: 729800.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000978", descricao: "9º B SUP, REQ 91 CLI - AQUISIÇÃO DE FILÉ DE TILÁPIA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90021/25 GERENCIADO PELA UASG 160136 - 9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 729800.00, liqRs: 0.00, empAliqRs: 729800.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000979", descricao: "9º B SUP, REQ 82 CLI - AQUISIÇÃO DE FRALDINHA, 2026NC412729, PREGÃO ELETRÔNICO Nº 90014/26GERENCIADO PELA UASG 160136-9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 885000.00, liqRs: 0.00, empAliqRs: 885000.00 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000980", descricao: "9º B SUP, REQ 81 CLI - AQUISIÇÃO DE CONTRA FILÉ, 2026NC412729, PREGÃO ELETRÔNICO Nº 90021/25 GERENCIADO PELA UASG 160136-9º GRUPAMENTO LOGÍSTICO.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 991652.50, liqRs: 0.00, empAliqRs: 991652.50 },
  { om: "9º B SUP", data: "17/08/26", ne: "160136000122026NE000981", descricao: "9º B SUP, REQ 89 CLI - AQUISIÇÃO DE SASSAMI DE FRANGO, 2026NC412729, PREGÃO ELETRÔNICO Nº 90014/26 GERENCIADO PELA UASG 160136.", pi: "E6SUPLJA2QS", nd: "339030", tipo: "G", acao: "212B", dias: 1, empRs: 658800.00, liqRs: 0.00, empAliqRs: 658800.00 },
];

// SLIDE 4: REQUISITANTE - RESTOS A PAGAR (RPNP)
const RPNP_DATA = [
  { om: "9º GPT LOG", uge: "160136", ne: "160136000122025NE001468", descricao: "CMDO 9º GPT LOG, REQ 291 ALMOX SV AGUA E ESGOTO, 2025NC026172 DE 22 DEZ 2025, DA DGO, ND 339000 UGR 160073 PTRES 171397 PI I3DACSPAGES, CONTRATO 125/2022 DA UASG 160136. REFORCO 2025 NE 1014.", favorecido: "4089570000150 - AGUAS GUARIROBA SA", nd: "339039", pi: "I3DACSPAGES", si: "44 - SERVICOS DE AGUA, ESGOTO E RESIDUOS SOLIDOS", tipo: "E", rpnpInsc: 151929.27, rpnpCanc: 0.00, rpnpAliq: 151929.27 },
  { om: "9º GPT LOG", uge: "160136", ne: "160136000122025NE001470", descricao: "CMDO 9º GPT LOG, REQ 292/2025-ALMOX-ENERGIA ELETRICA, 2025NC026395 DE 22/12/2025, DA DGO, ND 339039, UGR 160073, PI I3DACSPENEL, CONTRATO 41/2025, UASG 160136.", favorecido: "17858631000149 - MATRIX COMERCIALIZADORA DE ENERGIA ELETRICA S/A", nd: "339039", pi: "I3DACSPENEL", si: "43 - SERVICOS DE ENERGIA ELETRICA", tipo: "E", rpnpInsc: 72908.60, rpnpCanc: 0.00, rpnpAliq: 72908.60 },
  { om: "9º GPT LOG", uge: "160136", ne: "160136000122025NE001293", descricao: "CMDO 9º GPT LOG, REQ 230 ALMOX CMDO SV FORNECIMENTO DE ENERGIA ELETRICA, 2025NC020468 DE 7 NOV 25, DA DGO, ND 339039, UGR 160073, PI I3DAFUNADOM, CONTRATO 41/2025 DA UASG 160136.", favorecido: "17858631000149 - MATRIX COMERCIALIZADORA DE ENERGIA ELETRICA S/A", nd: "339039", pi: "I3DACSPENEL", si: "43 - SERVICOS DE ENERGIA ELETRICA", tipo: "E", rpnpInsc: 107742.86, rpnpCanc: 0.00, rpnpAliq: 42234.25 },
];

// SLIDE 5: REQUISITANTE - PREGÕES SRP (ATAS)
const SRP_ATA_DATA = [
  { ugg: "160136", numCompra: "900012026", fornecedor: "57.562.366/0001-71 - TATSUOTECH COMERCIO LTDA", numAtaAno: "178/2026", item: "01 - ABRAÇADEIRA, MATERIAL NÁILON, COMPRIMENTO TOTAL 200 MM, LARGURA 3,60 MM", vigencia: "14/07/27", valorUnt: 5.90, percQtdEmp: "0,00%", qtdDisponivel: 50.00, valorDispRs: 295.00 },
  { ugg: "160136", numCompra: "900102026", fornecedor: "21.932.461/0001-72 - PREMIER PECAS E SERVICOS LTDA", numAtaAno: "128/2026", item: "01 - ACESSÓRIOS / EQUIPAMENTOS OFICINA MANUTENÇÃO, TIPO CARRO ESTEIRA, MATERIAL AÇO", vigencia: "14/05/27", valorUnt: 1.00, percQtdEmp: "0,00%", qtdDisponivel: 240000.00, valorDispRs: 240000.00 },
  { ugg: "160136", numCompra: "900052025", fornecedor: "18.933.268/0001-11 - LRS DISTRIBUIDORA DE ALIMENTOS LTDA", numAtaAno: "191/2025", item: "01 - AÇÚCAR, TIPO REFINADO, COLORAÇÃO BRANCA, PRAZO VALIDADE MÍNIMO 12 MESES", vigencia: "20/08/26", valorUnt: 3.90, percQtdEmp: "31,32%", qtdDisponivel: 41235.00, valorDispRs: 160816.50 },
  { ugg: "160136", numCompra: "900142026", fornecedor: "19.697.908/0001-24 - ACUCAR NUMERO UM S.A.", numAtaAno: "206/2026", item: "01 - AÇÚCAR, TIPO REFINADO, COLORAÇÃO BRANCA, PRAZO VALIDADE MÍNIMO 12 MESES", vigencia: "04/08/27", valorUnt: 3.50, percQtdEmp: "0,00%", qtdDisponivel: 40680.00, valorDispRs: 142380.00 },
  { ugg: "160136", numCompra: "900212025", fornecedor: "12.433.700/0001-59 - NUTRICELLI COMERCIO DE ALIMENTOS LTDA", numAtaAno: "54/2026", item: "01 - AÇÚCAR, TIPO REFINADO, COLORAÇÃO BRANCA, PRAZO VALIDADE MÍNIMO 12 MESES", vigencia: "26/02/27", valorUnt: 4.44, percQtdEmp: "0,00%", qtdDisponivel: 26700.00, valorDispRs: 118548.00 },
];

// SLIDE 6: RPCM - NOTAS DE CRÉDITO REFERÊNCIA
const RPCM_NC_DATA = [
  { om: "9º B SUP", data: "10/08/26", uge: "160136", ncRef: "160504000012026NC412729", pi: "E6SUPLJA2QS", nd: "339030", prazoEmp: "30/10/26", percEmp: "51,27%", credDisp: 7680663.92, justificativa: "", prevEmp: "" },
  { om: "UGR", data: "01/04/26", uge: "160136", ncRef: "160504000012026NC104968A", pi: "E6SUPLJA3RR", nd: "339000", prazoEmp: "31/10/26", percEmp: "0,00%", credDisp: 263719.32, justificativa: "", prevEmp: "" },
  { om: "9º B MNT", data: "10/08/26", uge: "160136", ncRef: "160504000012026NC412605", pi: "E6SUPLJA1QR", nd: "339030", prazoEmp: "30/10/26", percEmp: "0,00%", credDisp: 203742.00, justificativa: "Até final de Agosto será empenhado 100%", prevEmp: "" },
  { om: "18º B TRNP", data: "10/08/26", uge: "160136", ncRef: "160504000012026NC412578", pi: "E6SUPLJA1QR", nd: "339030", prazoEmp: "30/10/26", percEmp: "0,00%", credDisp: 156240.00, justificativa: "Rerequisições em confecção (2ª provisão de QR)", prevEmp: "28/08/26" },
  { om: "18º B TRNP", data: "17/08/26", uge: "160136", ncRef: "160505000012026NC424611A", pi: "D6PEINDMV1A", nd: "339093", prazoEmp: "19/08/26", percEmp: "0,00%", credDisp: 61227.20, justificativa: "", prevEmp: "" },
];

// SLIDE 7: RPCM - NE(S) DO EXERCÍCIO CORRENTE
const RPCM_NE_DATA = [
  { om: "9º B SAU", diaEmissao: "02/02/26", ne: "167136000012026NE000001", pi: "D8SAFUNADOM", nd: "339039", tipo: "G", acao: "2004", resultadoLei: "PRIMARIO OBRIGATORIO", dias: 197, empAliqRs: 3036.00, justificativa: "Empenho Global, serviços ar condicionado. 02 NF valores de 850,00 e 980,00 já no Almox.", prazoLiq: "" },
  { om: "9º GPT LOG", diaEmissao: "03/02/26", ne: "160136000012026NE000026", pi: "I3DAFUNCOPI", nd: "339040", tipo: "G", acao: "2000", resultadoLei: "PRIMARIO DISCRICIONARIO", dias: 196, empAliqRs: 12978.65, justificativa: "Contrato continuado: PRO mensal no valor de R$ 4060,00", prazoLiq: "OUT 26" },
  { om: "9º GPT LOG", diaEmissao: "05/02/26", ne: "160136000012026NE000005", pi: "E3PCFSCINFO", nd: "339040", tipo: "G", acao: "2919", resultadoLei: "PRIMARIO OBRIGATORIO", dias: 194, empAliqRs: 4200.00, justificativa: "Contrato continuado para locação de impressora (SFPC): PRO mensal no valor de R$ 700", prazoLiq: "JAN 27" },
  { om: "18º B TRNP", diaEmissao: "09/02/26", ne: "160136000012026NE000048", pi: "E6SUPLJA3RR", nd: "339030", tipo: "G", acao: "212B", resultadoLei: "PRIMARIO OBRIGATORIO", dias: 190, empAliqRs: 1498.42, justificativa: "QR sob demanda (reserva regional)", prazoLiq: "30/09/26" },
  { om: "9º GPT LOG", diaEmissao: "09/02/26", ne: "160136000012026NE000014", pi: "IXAPFUNPNRE", nd: "339039", tipo: "G", acao: "2000", resultadoLei: "PRIMARIO DISCRICIONARIO", dias: 190, empAliqRs: 1314.72, justificativa: "Serviço de instalação de ar condicionado realizado para instalação no PNR Cmt (NF EMITIDA EM 13/08)", prazoLiq: "17/08" },
  { om: "9º B MNT", diaEmissao: "10/02/26", ne: "160136000012026NE000059", pi: "B6SUMEEASS4", nd: "339030", tipo: "G", acao: "21A0", resultadoLei: "PRIMARIO DISCRICIONARIO", dias: 189, empAliqRs: 2839.25, justificativa: "Trata-se de ÓLEO LUBRIFICANTE, USO MARÍTIMO, TIPO SEMISSINTÉTICO, VISCOSIDADE SAF 25W-50. Empresa notificada 2 vezes.", prazoLiq: "Maio 26" },
];

// SLIDE 8: RPCM - RESTOS A PAGAR NÃO PROCESSADOS (RPNPs)
const RPCM_RPNP_DATA = [
  { om: "9º GPT LOG", ne: "160136000012025NE001468", favorecido: "4089570000150 - AGUAS GUARIROBA SA", nd: "339039", pi: "I3DACSPAGES", si: "44 SERVICOS DE AGUA, ESGOTO E RESIDUOS SOLIDOS", tipo: "E", rpnpAliq: 151929.27, justificativa: "Contrato continuado de fornecimento de água, NF liquidada mensalmente conforme PRO R$ 35.000,00", prazoLiq: "DEZ/26" },
  { om: "9º GPT LOG", ne: "160136000012025NE001470", favorecido: "17858631000149 - MATRIX COMERCIALIZADORA DE ENERGIA ELETRICA S/A", nd: "339039", pi: "I3DACSPENEL", si: "43 SERVICOS DE ENERGIA ELETRICA", tipo: "E", rpnpAliq: 72908.60, justificativa: "Contrato continuado de fornecimento de energia elétrica (iniciou-se em março)", prazoLiq: "-" },
  { om: "9º GPT LOG", ne: "160136000012025NE001293", favorecido: "17858631000149 - MATRIX COMERCIALIZADORA DE ENERGIA ELETRICA S/A", nd: "339039", pi: "I3DACSPENEL", si: "43 SERVICOS DE ENERGIA ELETRICA", tipo: "E", rpnpAliq: 42234.25, justificativa: "Contrato continuado de fornecimento de energia elétrica (inicia em março)", prazoLiq: "-" },
  { om: "9º B MNT", ne: "167136000012025NE000242", favorecido: "56997623000135 - NEXUS PRODUTOS E SERVICOS LTDA", nd: "339039", pi: "FGA124XMMNT", si: "19 MANUTENCAO E CONSERV. DE VEICULOS", tipo: "G", rpnpAliq: 21490.00, justificativa: "Trata-se de serviço de manutenção de blindados. Motores enviados para empresa. Enviado para liquidação em 23/07.", prazoLiq: "Ago 26" },
];

export function CreditManagementClient() {
  const [activeSubpage, setActiveSubpage] = useState<string>("capa");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [filters, setFilters] = useState<CreditFilterOptions>({});
  const [expandedOm, setExpandedOm] = useState<string | null>("9º B SUP");

  const handleResetFilters = () => setFilters({});

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner com Identidade Visual do Forte Logístico 2026 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Tesouro Gerencial · Forte Logístico 2026
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
              10 Telas Power BI (Painel Mestre 100% Replicado)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7 text-emerald-400" />
            EXECUÇÃO ORÇAMENTÁRIA DO FORTE LOGÍSTICO 2026
          </h1>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Painel analítico contendo as 10 telas idênticas ao Power BI oficial do Tesouro Gerencial (UG 160136, 160142 e 160513).
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
            <span className="text-sm font-bold text-emerald-400">18/08/2026 09:44</span>
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

            {/* Slide 1: Capa */}
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

            {/* MÓDULO REQUISITANTE (Slides 2 a 5) */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider px-2 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> MÓDULO REQUISITANTE
              </div>
              <div className="pl-2 space-y-1 border-l-2 border-emerald-500/30">
                <button
                  onClick={() => setActiveSubpage("req_nc")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "req_nc" ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>NC(s) - Notas de Crédito</span>
                  <span className="text-[10px] opacity-75">({NC_REFERENCIA_DATA.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("req_ne")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "req_ne" ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>NE(s) - Notas de Empenho</span>
                  <span className="text-[10px] opacity-75">({NE_EXERCICIO_DATA.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("req_rpnp")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "req_rpnp" ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>RPNPs - Restos a Pagar</span>
                  <span className="text-[10px] opacity-75">({RPNP_DATA.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("req_srp")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "req_srp" ? "bg-emerald-500 text-zinc-950 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>Pregões SRP (Atas)</span>
                  <span className="text-[10px] opacity-75">({SRP_ATA_DATA.length})</span>
                </button>
              </div>
            </div>

            {/* MÓDULO RPCM (Slides 6 a 8) */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider px-2 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> MÓDULO RPCM (PROVEDOR)
              </div>
              <div className="pl-2 space-y-1 border-l-2 border-amber-500/30">
                <button
                  onClick={() => setActiveSubpage("rpcm_nc")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "rpcm_nc" ? "bg-amber-500 text-zinc-950 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>NC(s) - Créditos RPCM</span>
                  <span className="text-[10px] opacity-75">({RPCM_NC_DATA.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("rpcm_ne")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "rpcm_ne" ? "bg-amber-500 text-zinc-950 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>NE(s) - Empenhos RPCM</span>
                  <span className="text-[10px] opacity-75">({RPCM_NE_DATA.length})</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("rpcm_rpnp")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "rpcm_rpnp" ? "bg-amber-500 text-zinc-950 font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>RPNPs - Restos a Pagar RPCM</span>
                  <span className="text-[10px] opacity-75">({RPCM_RPNP_DATA.length})</span>
                </button>
              </div>
            </div>

            {/* MÓDULO META (Slides 9 e 10) */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider px-2 flex items-center gap-1">
                <Target className="h-3 w-3" /> MÓDULO META
              </div>
              <div className="pl-2 space-y-1 border-l-2 border-blue-500/30">
                <button
                  onClick={() => setActiveSubpage("meta_exercicio")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "meta_exercicio" ? "bg-blue-500 text-white font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>Do Exercício (2026)</span>
                </button>
                <button
                  onClick={() => setActiveSubpage("meta_rpnp")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    activeSubpage === "meta_rpnp" ? "bg-blue-500 text-white font-bold" : "text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  <span>De RPNP (Restos a Pagar)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body area for the selected subpage */}
        <div className="lg:col-span-9 space-y-6">
          {/* Universal Filter Bar */}
          <CreditFilterBar filters={filters} onChange={setFilters} onReset={handleResetFilters} />

          {/* SLIDE 1: Capa / Painel Geral */}
          {activeSubpage === "capa" && (
            <div className="space-y-6">
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
            </div>
          )}

          {/* SLIDE 2: Módulo Requisitante - NC(s) Referência */}
          {activeSubpage === "req_nc" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
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

              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-400" /> NOTAS DE CRÉDITO REFERÊNCIA
              </h3>

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
                    {NC_REFERENCIA_DATA.map((nc, idx) => (
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

          {/* SLIDE 3: Módulo Requisitante - NE(s) do Exercício Corrente */}
          {activeSubpage === "req_ne" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
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

              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-400" /> NE(s) DO EXERCÍCIO CORRENTE
              </h3>

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
                    {NE_EXERCICIO_DATA.map((ne, idx) => (
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

          {/* SLIDE 4: Módulo Requisitante - Restos a Pagar (RPNP) */}
          {activeSubpage === "req_rpnp" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-zinc-800 pb-4">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">RPNP Insc + Reinsc (R$)</span>
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

              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-400" /> RESTOS A PAGAR NÃO PROCESSADOS (RPNPs)
              </h3>

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
                    {RPNP_DATA.map((r, idx) => (
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

          {/* SLIDE 5: Módulo Requisitante - Pregões SRP */}
          {activeSubpage === "req_srp" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
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

              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-emerald-400" /> ANÁLISE DE ITENS VIGENTES DE PREGÃO
              </h3>

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
                    {SRP_ATA_DATA.map((s, idx) => (
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

          {/* SLIDE 6: Módulo RPCM - NC(s) Créditos RPCM */}
          {activeSubpage === "rpcm_nc" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
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

              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-400" /> RPCM - NOTAS DE CRÉDITO REFERÊNCIA
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">UGE</th>
                      <th className="py-2.5 px-3">NC Referência</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3">Prazo Emp</th>
                      <th className="py-2.5 px-3 text-center">% Emp</th>
                      <th className="py-2.5 px-3 text-right">Cred Disp (R$)</th>
                      <th className="py-2.5 px-3 max-w-xs">Justificativa</th>
                      <th className="py-2.5 px-3">Prev de Emp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                    {RPCM_NC_DATA.map((nc, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">{nc.om}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{nc.data}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{nc.uge}</td>
                        <td className="py-2.5 px-3 text-amber-400 font-bold">{nc.ncRef}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{nc.pi}</td>
                        <td className="py-2.5 px-3">{nc.nd}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{nc.prazoEmp}</td>
                        <td className="py-2.5 px-3 text-center text-amber-400">{nc.percEmp}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">{formatCurrency(nc.credDisp)}</td>
                        <td className="py-2.5 px-3 font-sans max-w-xs text-[11px]" title={nc.justificativa}>{nc.justificativa || "-"}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{nc.prevEmp || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 7: Módulo RPCM - NE(s) Empenhos RPCM */}
          {activeSubpage === "rpcm_ne" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 border-b border-zinc-800 pb-4">
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
                  <span className="text-[10px] text-amber-400 uppercase font-semibold block">Saldo a Liq Total (R$)</span>
                  <span className="text-lg font-bold text-amber-400">15,70 Mi</span>
                </div>
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800 bg-red-500/10">
                  <span className="text-[10px] text-red-400 uppercase font-semibold block">Saldo a Liq &gt;30 Dias (R$)</span>
                  <span className="text-lg font-bold text-red-400">6,74 Mi</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-400" /> RPCM - NE(s) DO EXERCÍCIO CORRENTE
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">Dia Emissão</th>
                      <th className="py-2.5 px-3">NE</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Ação</th>
                      <th className="py-2.5 px-3">Resultado Lei</th>
                      <th className="py-2.5 px-3 text-center">Dias</th>
                      <th className="py-2.5 px-3 text-right">Emp a Liq (R$)</th>
                      <th className="py-2.5 px-3 max-w-sm">Justificativa</th>
                      <th className="py-2.5 px-3">Prazo Liq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                    {RPCM_NE_DATA.map((ne, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">{ne.om}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{ne.diaEmissao}</td>
                        <td className="py-2.5 px-3 text-amber-400 font-bold">{ne.ne}</td>
                        <td className="py-2.5 px-3 text-emerald-400">{ne.pi}</td>
                        <td className="py-2.5 px-3">{ne.nd}</td>
                        <td className="py-2.5 px-3">{ne.tipo}</td>
                        <td className="py-2.5 px-3">{ne.acao}</td>
                        <td className="py-2.5 px-3 font-sans text-[10px] text-zinc-300">{ne.resultadoLei}</td>
                        <td className="py-2.5 px-3 text-center font-bold text-red-400">{ne.dias}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">{formatCurrency(ne.empAliqRs)}</td>
                        <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]" title={ne.justificativa}>{ne.justificativa}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{ne.prazoLiq || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 8: Módulo RPCM - Restos a Pagar RPCM */}
          {activeSubpage === "rpcm_rpnp" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 border-b border-zinc-800 pb-4">
                <div className="bg-zinc-950 p-3 rounded-lg border border-zinc-800">
                  <span className="text-[10px] text-zinc-400 uppercase font-semibold block">RPNP Insc + Reinsc (R$)</span>
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
                  <span className="text-lg font-bold text-amber-400">364,29 Mil</span>
                </div>
              </div>

              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-400" /> RPCM - RESTOS A PAGAR NÃO PROCESSADOS
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-zinc-950 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3">OM</th>
                      <th className="py-2.5 px-3">NE</th>
                      <th className="py-2.5 px-3 max-w-xs">Favorecido</th>
                      <th className="py-2.5 px-3">ND</th>
                      <th className="py-2.5 px-3">PI</th>
                      <th className="py-2.5 px-3">SI</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3 text-right">RPNP a Liq (R$)</th>
                      <th className="py-2.5 px-3 max-w-sm">Justificativa</th>
                      <th className="py-2.5 px-3">Prazo Liq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                    {RPCM_RPNP_DATA.map((r, idx) => (
                      <tr key={idx} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">{r.om}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">{r.ne}</td>
                        <td className="py-2.5 px-3 font-sans max-w-xs text-[11px]" title={r.favorecido}>{r.favorecido}</td>
                        <td className="py-2.5 px-3">{r.nd}</td>
                        <td className="py-2.5 px-3 text-amber-400">{r.pi}</td>
                        <td className="py-2.5 px-3 text-zinc-400 max-w-[150px] truncate" title={r.si}>{r.si}</td>
                        <td className="py-2.5 px-3">{r.tipo}</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">{formatCurrency(r.rpnpAliq)}</td>
                        <td className="py-2.5 px-3 font-sans max-w-sm text-[11px]" title={r.justificativa}>{r.justificativa}</td>
                        <td className="py-2.5 px-3 text-zinc-400">{r.prazoLiq}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SLIDE 9: Módulo Meta - Do Exercício 2026 */}
          {activeSubpage === "meta_exercicio" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-6">
              {/* Botões de Acesso por UG do Slide 9 */}
              <div className="flex flex-wrap items-center gap-3">
                <button className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs">
                  CLIQUE PARA VISUALIZAR AS OMVs do 9º Gpt Log (UG 160136 e 167136)
                </button>
                <button className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 border border-red-500/40 font-bold text-xs">
                  CLIQUE PARA VISUALIZAR O 9º B SUP (UG 160142 e 167142)
                </button>
              </div>

              {/* Tabela Resultado Lei & Metas por Ação */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold text-amber-400 uppercase">Metas por Resultado Lei</h4>
                  <table className="w-full text-left text-xs">
                    <thead className="text-zinc-500 border-b border-zinc-800">
                      <tr>
                        <th className="py-1">Resultado Lei</th>
                        <th className="py-1">Metas Emp</th>
                        <th className="py-1">% Emp</th>
                        <th className="py-1">Situação Emp</th>
                        <th className="py-1">% Liq</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      <tr>
                        <td className="py-1.5 font-sans font-semibold text-white">PRIMARIO OBRIGATORIO</td>
                        <td className="py-1.5 text-zinc-400">S/ META GERAL</td>
                        <td className="py-1.5 text-amber-400">77,45%</td>
                        <td className="py-1.5 text-emerald-400 font-bold">✔ Pronto</td>
                        <td className="py-1.5 text-emerald-400">41,05%</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-sans font-semibold text-white">PRIMARIO DISCRICIONARIO</td>
                        <td className="py-1.5 text-zinc-400">70,00%</td>
                        <td className="py-1.5 text-amber-400">95,04%</td>
                        <td className="py-1.5 text-emerald-400 font-bold">✔ Pronto</td>
                        <td className="py-1.5 text-emerald-400">54,52%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                  <h4 className="text-xs font-bold text-blue-400 uppercase">Metas por Ação</h4>
                  <table className="w-full text-left text-xs">
                    <thead className="text-zinc-500 border-b border-zinc-800">
                      <tr>
                        <th className="py-1">Ação</th>
                        <th className="py-1">Metas Emp</th>
                        <th className="py-1">% Emp</th>
                        <th className="py-1">Situação Emp</th>
                        <th className="py-1">% Liq</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      <tr>
                        <td className="py-1.5 font-bold text-white">2001</td>
                        <td className="py-1.5 text-zinc-400">50,00%</td>
                        <td className="py-1.5 text-amber-400">96,25%</td>
                        <td className="py-1.5 text-emerald-400 font-bold">✔ Pronto</td>
                        <td className="py-1.5 text-emerald-400">49,32%</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-white">212B</td>
                        <td className="py-1.5 text-zinc-400">60,00%</td>
                        <td className="py-1.5 text-amber-400">76,98%</td>
                        <td className="py-1.5 text-emerald-400 font-bold">✔ Pronto</td>
                        <td className="py-1.5 text-emerald-400">40,28%</td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-bold text-white">2120</td>
                        <td className="py-1.5 text-zinc-400">20,00%</td>
                        <td className="py-1.5 text-amber-400">70,55%</td>
                        <td className="py-1.5 text-emerald-400 font-bold">✔ Pronto</td>
                        <td className="py-1.5 text-emerald-400">67,16%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Tabela Principal Hierárquica da Matriz Módulo Meta */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase">Execução Orçamentária 9º Gpt Log (UG 160136 e 167136)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-900 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                      <tr>
                        <th className="py-2.5 px-3">OM / Ação / PI / ND</th>
                        <th className="py-2.5 px-3 text-right">Prov Atualizada (R$)</th>
                        <th className="py-2.5 px-3 text-right">Desp Emp (R$)</th>
                        <th className="py-2.5 px-3 text-center">% Emp</th>
                        <th className="py-2.5 px-3 text-right">Liq (R$)</th>
                        <th className="py-2.5 px-3 text-center">% Liq</th>
                        <th className="py-2.5 px-3 text-right">Emp A Liquidar (R$)</th>
                        <th className="py-2.5 px-3 text-right">Cred Disponível (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {/* 9º B SUP */}
                      <tr
                        onClick={() => setExpandedOm(expandedOm === "9º B SUP" ? null : "9º B SUP")}
                        className="bg-zinc-900/40 hover:bg-zinc-800/60 cursor-pointer transition-colors"
                      >
                        <td className="py-2.5 px-3 font-bold text-white flex items-center gap-2">
                          {expandedOm === "9º B SUP" ? <ChevronDown className="h-3.5 w-3.5 text-amber-400" /> : <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />}
                          9º B SUP
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">36.435.380,90</td>
                        <td className="py-2.5 px-3 text-right text-amber-400">28.414.510,38</td>
                        <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">77,99%</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400">14.926.419,26</td>
                        <td className="py-2.5 px-3 text-center text-amber-400">40,97%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">13.488.091,12</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">8.020.870,52</td>
                      </tr>

                      {expandedOm === "9º B SUP" && (
                        <>
                          <tr className="bg-zinc-950/80 text-zinc-400">
                            <td className="py-2 px-3 pl-8 font-sans">↳ 212B - Suprimento de Subsistência</td>
                            <td className="py-2 px-3 text-right">34.906.082,00</td>
                            <td className="py-2 px-3 text-right text-amber-400">26.942.380,61</td>
                            <td className="py-2 px-3 text-center">77,19%</td>
                            <td className="py-2 px-3 text-right text-emerald-400">14.070.292,56</td>
                            <td className="py-2 px-3 text-center">40,31%</td>
                            <td className="py-2 px-3 text-right">12.872.088,05</td>
                            <td className="py-2 px-3 text-right text-emerald-400">7.963.701,39</td>
                          </tr>
                          <tr className="bg-zinc-950/80 text-zinc-400">
                            <td className="py-2 px-3 pl-8 font-sans">↳ 2004 - Manutenção da Frota</td>
                            <td className="py-2 px-3 text-right">808.443,90</td>
                            <td className="py-2 px-3 text-right text-amber-400">773.537,07</td>
                            <td className="py-2 px-3 text-center">95,68%</td>
                            <td className="py-2 px-3 text-right text-emerald-400">376.033,70</td>
                            <td className="py-2 px-3 text-center">46,51%</td>
                            <td className="py-2 px-3 text-right">397.503,37</td>
                            <td className="py-2 px-3 text-right text-emerald-400">34.906,83</td>
                          </tr>
                        </>
                      )}

                      {/* 18º B TRNP */}
                      <tr className="bg-zinc-900/40 hover:bg-zinc-800/60 transition-colors">
                        <td className="py-2.5 px-3 font-bold text-white">18º B TRNP</td>
                        <td className="py-2.5 px-3 text-right font-bold text-white">2.898.614,50</td>
                        <td className="py-2.5 px-3 text-right text-amber-400">2.601.207,28</td>
                        <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">89,74%</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400">1.614.376,49</td>
                        <td className="py-2.5 px-3 text-center text-amber-400">55,69%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">986.830,79</td>
                        <td className="py-2.5 px-3 text-right font-bold text-emerald-400">297.407,22</td>
                      </tr>

                      {/* TOTAL */}
                      <tr className="bg-zinc-950 font-bold text-white border-t-2 border-zinc-700">
                        <td className="py-3 px-3 uppercase">Total Geral</td>
                        <td className="py-3 px-3 text-right">43.306.816,72</td>
                        <td className="py-3 px-3 text-right text-amber-400">34.295.503,93</td>
                        <td className="py-3 px-3 text-center text-emerald-400">79,19%</td>
                        <td className="py-3 px-3 text-right text-emerald-400">18.600.056,39</td>
                        <td className="py-3 px-3 text-center text-amber-400">42,95%</td>
                        <td className="py-3 px-3 text-right text-amber-400">15.695.447,54</td>
                        <td className="py-3 px-3 text-right text-emerald-400">9.011.312,79</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SLIDE 10: Módulo Meta - De RPNP (Restos a Pagar) */}
          {activeSubpage === "meta_rpnp" && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm space-y-6">
              {/* Tabela Ação x Metas Liq do Slide 10 */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 max-w-md space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase">Metas de Liquidação RPNP por Ação</h4>
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-zinc-500 border-b border-zinc-800">
                    <tr>
                      <th className="py-1">Ação</th>
                      <th className="py-1">Metas Liq</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    <tr>
                      <td className="py-1 text-white font-bold">2128</td>
                      <td className="py-1 text-emerald-400">100% (JUN)</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-white font-bold">2865</td>
                      <td className="py-1 text-emerald-400">30% (JUN)</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-white font-bold">219D</td>
                      <td className="py-1 text-emerald-400">50% (JUN)</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-white font-bold">2919</td>
                      <td className="py-1 text-emerald-400">60% (JUN)</td>
                    </tr>
                    <tr>
                      <td className="py-1 text-white font-bold">2004</td>
                      <td className="py-1 text-emerald-400">70% (JUN)</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Tabela Principal Hierárquica RPNP */}
              <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-white uppercase">Execução Orçamentária de RPNP do 9º Gpt Log (UG 160136 e 167136)</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-zinc-900 text-zinc-400 uppercase font-bold border-b border-zinc-800">
                      <tr>
                        <th className="py-2.5 px-3">OM / Ação / PI / ND</th>
                        <th className="py-2.5 px-3 text-right">RPNP Insc (R$)</th>
                        <th className="py-2.5 px-3 text-right">RPNP Liq (R$)</th>
                        <th className="py-2.5 px-3 text-center">% RPNP Liq</th>
                        <th className="py-2.5 px-3 text-right">RPNP Canc (R$)</th>
                        <th className="py-2.5 px-3 text-center">% RPNP Canc</th>
                        <th className="py-2.5 px-3 text-right">RPNP a Liquidar (R$)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono">
                      {/* 9º GPT LOG */}
                      <tr className="bg-zinc-900/40">
                        <td className="py-2.5 px-3 font-bold text-white">9º GPT LOG</td>
                        <td className="py-2.5 px-3 text-right text-white">1.163.380,70</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">871.689,51</td>
                        <td className="py-2.5 px-3 text-center text-emerald-400">74,93%</td>
                        <td className="py-2.5 px-3 text-right text-zinc-400">0,00</td>
                        <td className="py-2.5 px-3 text-center text-zinc-400">0,00%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">291.691,19</td>
                      </tr>

                      {/* 9º B MNT */}
                      <tr className="bg-zinc-900/40">
                        <td className="py-2.5 px-3 font-bold text-white">9º B MNT</td>
                        <td className="py-2.5 px-3 text-right text-white">1.085.351,48</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">1.039.675,02</td>
                        <td className="py-2.5 px-3 text-center text-emerald-400">95,79%</td>
                        <td className="py-2.5 px-3 text-right text-zinc-400">1,26</td>
                        <td className="py-2.5 px-3 text-center text-zinc-400">0,00%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">45.675,20</td>
                      </tr>

                      {/* 18º B TRNP */}
                      <tr className="bg-zinc-900/40">
                        <td className="py-2.5 px-3 font-bold text-white">18º B TRNP</td>
                        <td className="py-2.5 px-3 text-right text-white">844.273,52</td>
                        <td className="py-2.5 px-3 text-right text-emerald-400 font-bold">817.598,61</td>
                        <td className="py-2.5 px-3 text-center text-emerald-400">96,84%</td>
                        <td className="py-2.5 px-3 text-right text-zinc-400">54,09</td>
                        <td className="py-2.5 px-3 text-center text-zinc-400">0,01%</td>
                        <td className="py-2.5 px-3 text-right font-bold text-amber-400">26.620,82</td>
                      </tr>

                      {/* TOTAL */}
                      <tr className="bg-zinc-950 font-bold text-white border-t-2 border-zinc-700">
                        <td className="py-3 px-3 uppercase">Total Geral</td>
                        <td className="py-3 px-3 text-right">8.707.966,70</td>
                        <td className="py-3 px-3 text-right text-emerald-400">8.343.286,49</td>
                        <td className="py-3 px-3 text-center text-emerald-400">95,81%</td>
                        <td className="py-3 px-3 text-right text-zinc-400">385,80</td>
                        <td className="py-3 px-3 text-center text-zinc-400">0,00%</td>
                        <td className="py-3 px-3 text-right text-amber-400">364.294,41</td>
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
