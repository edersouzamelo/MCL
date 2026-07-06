import { persistenceMode } from "@/modules/coverage/service";
import type { DemoState } from "@/modules/domain/types";

export type SourceKind =
  | "EXTERNAL_SYSTEM"
  | "PUBLIC_SOURCE"
  | "DOCUMENT_SOURCE"
  | "LOCAL_DERIVED_SOURCE"
  | "MCL_NATIVE_CAPABILITY"
  | "DEMO_SIMULATOR"
  | "GAP_TO_MAP";

export type DataNature =
  | "REAL_PUBLICA"
  | "REAL_RESTRITA_NAO_INTEGRADA"
  | "LOCAL_DERIVADA"
  | "MANUAL_VALIDADA"
  | "SINTETICA_DEMONSTRATIVA"
  | "DESCONHECIDA_A_MAPEAR";

export type IntegrationMaturity =
  | "INTEGRADO_REAL"
  | "INTEGRADO_PARCIAL"
  | "PLANEJADO"
  | "MAPEADO_NAO_INTEGRADO"
  | "INDISPONIVEL"
  | "DESCONHECIDO"
  | "DEMONSTRATIVO";

export type IntegrationMethod =
  | "API"
  | "EVENTO"
  | "ETL"
  | "CSV"
  | "JSON"
  | "XML"
  | "PLANILHA"
  | "REFERENCIA_DOCUMENTAL"
  | "ENTRADA_HUMANA_VALIDADA"
  | "NAO_INTEGRADO"
  | "DESCONHECIDO";

export type SourceSystemDomain =
  | "Necessidades"
  | "Aquisições"
  | "Orçamento e finanças"
  | "Recebimento"
  | "Estoque / armazém"
  | "Transporte / distribuição"
  | "Documental"
  | "Local / derivado / contingência";

export type SourceSystemAuthority =
  | "OFICIAL"
  | "AUXILIAR"
  | "DERIVADA"
  | "SINTETICA"
  | "DESCONHECIDA";

export interface SourceSystemCatalogEntry {
  id: string;
  name: string;
  domain: SourceSystemDomain;
  sourceKind: SourceKind;
  authority: SourceSystemAuthority;
  nature: DataNature;
  integrationMethod: IntegrationMethod;
  maturity: IntegrationMaturity;
  status: "SAUDAVEL" | "ATRASADO" | "FALHA" | "VAZIO" | "NAO_CONFIGURADO" | "PENDENTE" | "NAO_INTEGRADO" | "DESCONHECIDO";
  lastRunAt?: string | null;
  lastMessage?: string | null;
  limitations: string[];
  observation?: string;
  
  // Optional telemetry for integrated systems like Compras.gov
  telemetry?: {
    endpoint?: string | null;
    recordsRead?: number | null;
    acceptedRecords?: number | null;
    updatedRecords?: number | null;
    duplicateRecords?: number | null;
    rejectedRecords?: number | null;
    durationMs?: number | null;
    mappingVersion?: string | null;
  };
}

export interface DiagnosticResponse {
  environment: {
    database: "persistent" | "memory" | "unknown";
    demoMode: boolean;
    warnings: string[];
  };
  systems: SourceSystemCatalogEntry[];
}

export function getDiagnosticData(state: DemoState): DiagnosticResponse {
  const dbMode = persistenceMode();
  const dbType = dbMode === "postgresql" ? "persistent" : dbMode === "demo-memory" ? "memory" : "unknown";
  const demoMode = process.env.DEMO_AUTH_ENABLED !== "false";
  
  const warnings: string[] = [];
  if (dbType === "memory") {
    warnings.push("O sistema esta rodando em modo de fallback em memoria. Os dados serao reiniciados ao reiniciar a aplicacao.");
  }

  // Load the live Compras.gov connector data from state if available
  const liveComprasGov = state.connectors.find((c) => c.id === "compras-gov");
  
  const systems: SourceSystemCatalogEntry[] = [
    // A) e-PRDU
    {
      id: "eprdu",
      name: "e-PRDU",
      domain: "Necessidades",
      sourceKind: "EXTERNAL_SYSTEM",
      authority: "OFICIAL",
      nature: "REAL_RESTRITA_NAO_INTEGRADA",
      integrationMethod: "NAO_INTEGRADO",
      maturity: "MAPEADO_NAO_INTEGRADO",
      status: "NAO_INTEGRADO",
      limitations: [
        "Depende de autorização institucional e contrato de interconexão técnica.",
        "Acesso restrito a usuários e redes autenticadas do e-PRDU."
      ],
      observation: "Não chamar automaticamente; depende de autorização e contrato técnico."
    },
    // B) SIGELOG / PDRLog
    {
      id: "sigelog-pdrlog",
      name: "SIGELOG / PDRLog",
      domain: "Necessidades",
      sourceKind: "EXTERNAL_SYSTEM",
      authority: "OFICIAL",
      nature: "REAL_RESTRITA_NAO_INTEGRADA",
      integrationMethod: "NAO_INTEGRADO",
      maturity: "MAPEADO_NAO_INTEGRADO",
      status: "NAO_INTEGRADO",
      limitations: [
        "Escopo funcional real de distribuição e necessidades de fardamento precisa ser homologado.",
        "Ausência de endpoints públicos expostos."
      ],
      observation: "Confirmar escopo real antes de implementar conector."
    },
    // C) PGC / PCA
    {
      id: "pgc-pca",
      name: "PGC / PCA — Planejamento e Gerenciamento de Contratações",
      domain: "Necessidades",
      sourceKind: "DOCUMENT_SOURCE",
      authority: "OFICIAL",
      nature: "REAL_RESTRITA_NAO_INTEGRADA",
      integrationMethod: "NAO_INTEGRADO",
      maturity: "MAPEADO_NAO_INTEGRADO",
      status: "NAO_INTEGRADO",
      limitations: [
        "Acesso restrito ao sistema de planejamento de contratações do Governo Federal.",
        "Não substitui necessidade logística operacional emergencial ou demanda tática do e-PRDU."
      ],
      observation: "Fonte de planejamento da contratação. Não substitui necessidade logística operacional, e-PRDU, SIGELOG/PDRLog ou demanda emergencial."
    },
    // D) PNCP
    {
      id: "pncp-portal",
      name: "PNCP - Portal Nacional de Contratações Públicas",
      domain: "Aquisições",
      sourceKind: "PUBLIC_SOURCE",
      authority: "OFICIAL",
      nature: "REAL_PUBLICA",
      integrationMethod: "REFERENCIA_DOCUMENTAL",
      maturity: "PLANEJADO",
      status: "PENDENTE",
      limitations: [
        "Apenas referência documental planejada no momento.",
        "API pública nacional a ser integrada em sprints futuras."
      ],
      observation: "Não confundir com sistema interno de necessidade."
    },
    // E) Compras.gov.br
    {
      id: "compras-gov",
      name: "Compras.gov.br (SIASG / Comprasnet)",
      domain: "Aquisições",
      sourceKind: "PUBLIC_SOURCE",
      authority: "OFICIAL",
      nature: "REAL_PUBLICA",
      integrationMethod: "API",
      maturity: "INTEGRADO_PARCIAL",
      status: (liveComprasGov?.status as any) ?? "ATRASADO",
      lastRunAt: liveComprasGov?.lastRunAt,
      lastMessage: liveComprasGov?.message,
      limitations: [
        "Somente leitura de atas públicas federais.",
        "Não garante a existência de saldo em atas se o retorno da consulta estiver vazio na API do Compras.gov."
      ],
      observation: "Apenas consulta de atas vigentes por código CATMAT.",
      telemetry: liveComprasGov ? {
        endpoint: liveComprasGov.endpoint,
        recordsRead: liveComprasGov.recordsRead,
        acceptedRecords: liveComprasGov.acceptedRecords ?? liveComprasGov.recordsImported,
        updatedRecords: liveComprasGov.updatedRecords,
        duplicateRecords: liveComprasGov.duplicateRecords,
        rejectedRecords: liveComprasGov.rejectedRecords,
        durationMs: liveComprasGov.durationMs,
        mappingVersion: liveComprasGov.mappingVersion,
      } : undefined
    },
    // F) MCL — Piloto de Cobertura CATMAT/ARP
    {
      id: "mcl-catmat-arp-coverage",
      name: "MCL — Piloto de Cobertura CATMAT/ARP",
      domain: "Aquisições",
      sourceKind: "MCL_NATIVE_CAPABILITY",
      authority: "AUXILIAR",
      nature: "MANUAL_VALIDADA",
      integrationMethod: "API",
      maturity: "DEMONSTRATIVO",
      status: "SAUDAVEL",
      limitations: [
        "Focado no mapeamento piloto de itens selecionados.",
        "Depende da confirmação humana do CATMAT e do código de homologação."
      ],
      observation: "Capacidade nativa do MCL para buscar CATMAT/ARP, exigir confirmação humana e gerar síntese determinística. Não substitui processo formal de aquisição."
    },
    // G) SIAFI
    {
      id: "siafi-stn",
      name: "SIAFI (Secretaria do Tesouro Nacional)",
      domain: "Orçamento e finanças",
      sourceKind: "EXTERNAL_SYSTEM",
      authority: "OFICIAL",
      nature: "REAL_RESTRITA_NAO_INTEGRADA",
      integrationMethod: "NAO_INTEGRADO",
      maturity: "MAPEADO_NAO_INTEGRADO",
      status: "NAO_INTEGRADO",
      limitations: [
        "Ambiente restrito sob rede segura do Governo Federal (Serpro/STN).",
        "Vedado o uso de dados de saldo financeiro ou empenhos reais em ambiente de piloto de homologação."
      ],
      observation: "Não chamar, não simular saldo real, não inserir dados reais."
    },
    // H) SAG
    {
      id: "sag-financeiro",
      name: "SAG",
      domain: "Orçamento e finanças",
      sourceKind: "EXTERNAL_SYSTEM",
      authority: "AUXILIAR",
      nature: "REAL_RESTRITA_NAO_INTEGRADA",
      integrationMethod: "NAO_INTEGRADO",
      maturity: "MAPEADO_NAO_INTEGRADO",
      status: "NAO_INTEGRADO",
      limitations: [
        "Estrutura de dados local/gerencial sob validação funcional posterior."
      ],
      observation: "Exigir confirmação funcional posterior."
    },
    // I) Dashboard PowerBI local
    {
      id: "powerbi-local",
      name: "Dashboard PowerBI local",
      domain: "Local / derivado / contingência",
      sourceKind: "LOCAL_DERIVED_SOURCE",
      authority: "DERIVADA",
      nature: "LOCAL_DERIVADA",
      integrationMethod: "PLANILHA",
      maturity: "MAPEADO_NAO_INTEGRADO",
      status: "NAO_CONFIGURADO",
      limitations: [
        "Apresenta apenas visão analítica estática de exportações legadas.",
        "Não deve ser utilizado como fonte de dados primária de autoridade."
      ],
      observation: "Não tratar como fonte primária de autoridade; rotular como visão derivada/local."
    },
    // J) MCL — QR / Passaporte Digital / Recebimento
    {
      id: "mcl-qr-recebimento",
      name: "MCL — QR e Passaporte Digital de Recebimento",
      domain: "Recebimento",
      sourceKind: "MCL_NATIVE_CAPABILITY",
      authority: "AUXILIAR",
      nature: "MANUAL_VALIDADA",
      integrationMethod: "ENTRADA_HUMANA_VALIDADA",
      maturity: "DEMONSTRATIVO",
      status: "SAUDAVEL",
      limitations: [
        "Registra apenas evento físico demonstrativo no MCL.",
        "Não comprova recebimento documental, patrimonial, fiscal ou financeiro oficial.",
        "Não deve receber dados reais sem autorização institucional."
      ],
      observation: "Registra evento físico de recebimento no piloto. Não comprova recebimento documental, fiscal, patrimonial ou financeiro oficial."
    },
    // K) SISCOFIS-WEB
    {
      id: "siscofis-web",
      name: "SISCOFIS-WEB",
      domain: "Estoque / armazém",
      sourceKind: "EXTERNAL_SYSTEM",
      authority: "OFICIAL",
      nature: "REAL_RESTRITA_NAO_INTEGRADA",
      integrationMethod: "NAO_INTEGRADO",
      maturity: "MAPEADO_NAO_INTEGRADO",
      status: "NAO_INTEGRADO",
      limitations: [
        "Rede corporativa militar fechada.",
        "Proibido simular estoque ou depósitos reais sem conformidade de segurança."
      ],
      observation: "Não simular estoque real."
    },
    // L) MCL — Piloto de Armazenagem e Endereçamento
    {
      id: "mcl-storage-pilot",
      name: "MCL — Piloto de Armazenagem e Endereçamento",
      domain: "Estoque / armazém",
      sourceKind: "MCL_NATIVE_CAPABILITY",
      authority: "AUXILIAR",
      nature: "SINTETICA_DEMONSTRATIVA",
      integrationMethod: "ENTRADA_HUMANA_VALIDADA",
      maturity: "DEMONSTRATIVO",
      status: "PENDENTE",
      limitations: [
        "Capacidade nativa para fins demonstrativos.",
        "Não substitui SISCOFIS-WEB ou registros patrimoniais oficiais."
      ],
      observation: "Capacidade nativa para registrar MATERIAL_ARMAZENADO, localização, condição e vínculo com unidade logística. Não substitui SISCOFIS-WEB."
    },
    // M) Transporte externo / sistema a mapear
    {
      id: "transporte-gap",
      name: "Transporte externo / sistema a mapear",
      domain: "Transporte / distribuição",
      sourceKind: "GAP_TO_MAP",
      authority: "DESCONHECIDA",
      nature: "DESCONHECIDA_A_MAPEAR",
      integrationMethod: "DESCONHECIDO",
      maturity: "DESCONHECIDO",
      status: "DESCONHECIDO",
      limitations: [
        "Sistema ou processo externo de transporte/remessa ainda não identificado."
      ],
      observation: "Representa lacuna no mapeamento das transportadoras e canais oficiais de entrega."
    },
    // N) MCL — Piloto de Remessa e Entrega
    {
      id: "mcl-delivery-pilot",
      name: "MCL — Piloto de Remessa e Entrega",
      domain: "Transporte / distribuição",
      sourceKind: "MCL_NATIVE_CAPABILITY",
      authority: "AUXILIAR",
      nature: "SINTETICA_DEMONSTRATIVA",
      integrationMethod: "ENTRADA_HUMANA_VALIDADA",
      maturity: "DEMONSTRATIVO",
      status: "PENDENTE",
      limitations: [
        "Limita-se ao registro demonstrativo interno no MCL.",
        "Não realiza emissão de guias de transporte ou contratação de frete real."
      ],
      observation: "Capacidade nativa para registrar REMESSA_EXPEDIDA, MATERIAL_EM_TRANSITO e MATERIAL_ENTREGUE no piloto. Não substitui sistema oficial de transporte."
    },
    // O) Controles locais / planilhas / relatórios
    {
      id: "planilhas-locais",
      name: "Controles locais / Planilhas / Relatórios",
      domain: "Local / derivado / contingência",
      sourceKind: "LOCAL_DERIVED_SOURCE",
      authority: "DERIVADA",
      nature: "MANUAL_VALIDADA",
      integrationMethod: "ENTRADA_HUMANA_VALIDADA",
      maturity: "DEMONSTRATIVO",
      status: "SAUDAVEL",
      limitations: [
        "Dados inseridos por operadores demonstrativos.",
        "Sujeito a falha e divergência de digitação manual."
      ],
      observation: "Permitido apenas quando explicitamente marcado como local/manual/derivado."
    },
    
    // Active simulator connectors to keep existing test/demo data mapped cleanly
    {
      id: "connector-needs",
      name: "Simulador de Necessidades do Piloto",
      domain: "Necessidades",
      sourceKind: "DEMO_SIMULATOR",
      authority: "SINTETICA",
      nature: "SINTETICA_DEMONSTRATIVA",
      integrationMethod: "JSON",
      maturity: "DEMONSTRATIVO",
      status: "SAUDAVEL",
      lastRunAt: "2026-07-02T10:00:00.000-04:00",
      limitations: ["Usa apenas dados sintéticos em memória para simular demandas."],
      observation: "Usado apenas para fins de demonstração visual e simulação de fluxo."
    },
    {
      id: "connector-finance",
      name: "Simulador Financeiro do Piloto",
      domain: "Orçamento e finanças",
      sourceKind: "DEMO_SIMULATOR",
      authority: "SINTETICA",
      nature: "SINTETICA_DEMONSTRATIVA",
      integrationMethod: "JSON",
      maturity: "DEMONSTRATIVO",
      status: "ATRASADO",
      lastRunAt: "2026-07-02T06:45:00.000-04:00",
      limitations: ["Usa apenas créditos e empenhos sintéticos em memória."],
      observation: "Simula transações do SIAFI/Orçamento no piloto."
    },
    {
      id: "connector-transport",
      name: "Simulador de Transporte do Piloto",
      domain: "Transporte / distribuição",
      sourceKind: "DEMO_SIMULATOR",
      authority: "SINTETICA",
      nature: "SINTETICA_DEMONSTRATIVA",
      integrationMethod: "JSON",
      maturity: "DEMONSTRATIVO",
      status: "FALHA",
      lastRunAt: "2026-07-02T09:40:00.000-04:00",
      limitations: ["Simula falha de conexão de transporte para verificar tratamento de erros."],
      observation: "Usado para validar alertas e quarentena no piloto."
    }
  ];

  return {
    environment: {
      database: dbType,
      demoMode,
      warnings
    },
    systems
  };
}
