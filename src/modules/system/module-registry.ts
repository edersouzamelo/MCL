export type ModuleMaturity = "Operacional" | "Parcial" | "Mapeado";

export interface SupportingModuleDefinition {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  href: string;
  maturity: ModuleMaturity;
}

/** Capacidades transversais que sustentam a cadeia, sem constituir etapas logísticas. */
export const COMPLEMENTARY_MODULES: readonly SupportingModuleDefinition[] = [
  {
    id: "usuarios-perfis",
    title: "Gestão de usuários e perfis",
    shortTitle: "Usuários e perfis",
    description: "Identidades, papéis e permissões de acesso às capacidades do MCL.",
    href: "/admin/usuarios",
    maturity: "Operacional",
  },
  {
    id: "uasg-escopos",
    title: "Gestão de UASG e escopos",
    shortTitle: "UASG e escopos",
    description: "Recortes organizacionais que delimitam consulta, comando e visibilidade.",
    href: "/admin/usuarios",
    maturity: "Parcial",
  },
  {
    id: "identidade-segredos",
    title: "Identidade, acesso e segredos",
    shortTitle: "Acesso e segredos",
    description: "Políticas de autenticação e referências seguras para integrações; não armazena senhas de terceiros.",
    href: "/admin/usuarios",
    maturity: "Parcial",
  },
  {
    id: "registro-continuidade",
    title: "Registro de Continuidade Logística",
    shortTitle: "Registro de continuidade",
    description: "Eventos, vínculos e projeções que preservam a trajetória sem fundir os bancos de autoridade.",
    href: "/registro-continuidade",
    maturity: "Operacional",
  },
  {
    id: "conectores",
    title: "Gestão de conectores",
    shortTitle: "Conectores",
    description: "Catálogo, maturidade e diagnóstico das fontes externas e capacidades nativas.",
    href: "/conectores",
    maturity: "Operacional",
  },
  {
    id: "auditoria",
    title: "Módulo de auditoria",
    shortTitle: "Auditoria",
    description: "Trilha append-only de ações, consultas e alterações relevantes.",
    href: "/auditoria",
    maturity: "Operacional",
  },
  {
    id: "importacao-etl",
    title: "Importação e ETL",
    shortTitle: "Importação e ETL",
    description: "Entrada controlada, validação, normalização e rastreabilidade de conjuntos de dados.",
    href: "/importacao",
    maturity: "Parcial",
  },
] as const;

/** Capacidades de ampliação: úteis, mas não necessárias ao núcleo determinístico do MCL. */
export const SUPPLEMENTARY_MODULES: readonly SupportingModuleDefinition[] = [
  {
    id: "agente-llm",
    title: "Agente LLM com RAG",
    shortTitle: "Assistente IA",
    description: "Consulta assistida às evidências autorizadas, com modo determinístico para testes.",
    href: "/assistente",
    maturity: "Parcial",
  },
  {
    id: "painel-ccol",
    title: "Painel do CCOL",
    shortTitle: "Painel do CCOL",
    description: "Visão agregada de comando para escalões e centros de coordenação logística.",
    href: "/grupamento",
    maturity: "Parcial",
  },
  {
    id: "guia-tecnico",
    title: "Guia técnico e expansão",
    shortTitle: "Guia técnico",
    description: "Referência para evolução governada de módulos, fontes e integrações.",
    href: "/guia-tecnico",
    maturity: "Mapeado",
  },
] as const;
