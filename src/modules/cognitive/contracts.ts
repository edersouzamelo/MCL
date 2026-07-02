export interface ReadonlyToolContext {
  requestId: string;
  actorId: string;
  purpose: string;
}

export interface ReadonlyToolResult<T> {
  data: T;
  sources: Array<{ sourceSystem: string; sourceRecordId: string; confidence: number }>;
  gaps: string[];
}

export type ConsultarSituacaoMaterial = (
  context: ReadonlyToolContext,
  logisticsUnitId: string,
) => Promise<ReadonlyToolResult<Record<string, unknown>>>;

export type ReconstruirTrajetoriaLote = (
  context: ReadonlyToolContext,
  lotId: string,
) => Promise<ReadonlyToolResult<Record<string, unknown>>>;

export interface CognitiveToolCatalog {
  consultarSituacaoMaterial: ConsultarSituacaoMaterial;
  reconstruirTrajetoriaLote: ReconstruirTrajetoriaLote;
  compararNecessidadesEstoque: (context: ReadonlyToolContext) => Promise<ReadonlyToolResult<Record<string, unknown>>>;
  consultarCreditoEmpenho: (context: ReadonlyToolContext, commitmentId: string) => Promise<ReadonlyToolResult<Record<string, unknown>>>;
  localizarInstrumentoAquisicao: (context: ReadonlyToolContext, instrumentId: string) => Promise<ReadonlyToolResult<Record<string, unknown>>>;
  executarAnaliseMulticriterio: (context: ReadonlyToolContext, needId: string) => Promise<ReadonlyToolResult<Record<string, unknown>>>;
  listarDivergencias: (context: ReadonlyToolContext) => Promise<ReadonlyToolResult<Record<string, unknown>>>;
  recuperarDocumentos: (context: ReadonlyToolContext, objectId: string) => Promise<ReadonlyToolResult<Record<string, unknown>>>;
}
