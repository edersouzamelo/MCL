export const DEMO_NOTICE =
  "AMBIENTE DEMONSTRATIVO - DADOS SINTETICOS - NAO CONSTITUI SISTEMA OFICIAL";

export const INSTITUTIONAL_IDENTITY_NOTICE =
  "Em eventual implantacao institucional, o provedor demonstrativo devera ser substituido ou integrado a um provedor de identidade autorizado.";

export type Role =
  | "COMMAND_VIEWER"
  | "LOGISTICS_MANAGER"
  | "WAREHOUSE_OPERATOR"
  | "AUDITOR"
  | "ADMIN"
  | "READ_ONLY";

export type DataNature =
  | "validado"
  | "informado"
  | "calculado"
  | "estimado"
  | "divergente"
  | "pendente";

export type EventType =
  | "NECESSIDADE_CRIADA"
  | "NECESSIDADE_APROVADA"
  | "CREDITO_DISPONIBILIZADO"
  | "INSTRUMENTO_VINCULADO"
  | "EMPENHO_EMITIDO"
  | "FORNECIMENTO_INICIADO"
  | "MATERIAL_EXPEDIDO_FORNECEDOR"
  | "MATERIAL_RECEBIDO"
  | "INSPECAO_CONCLUIDA"
  | "MATERIAL_ARMAZENADO"
  | "ESTOQUE_RESERVADO"
  | "MATERIAL_SEPARADO"
  | "REMESSA_EXPEDIDA"
  | "MATERIAL_EM_TRANSITO"
  | "MATERIAL_ENTREGUE"
  | "DIVERGENCIA_REGISTRADA"
  | "EVENTO_CORRIGIDO";

export type LogisticsUnitState =
  | "IDENTIFICADO"
  | "AGUARDANDO_INSPECAO"
  | "DISPONIVEL"
  | "ARMAZENADO"
  | "RESERVADO"
  | "SEPARADO"
  | "EM_TRANSITO"
  | "ENTREGUE";

export type ConnectorStatus = "SAUDAVEL" | "ATRASADO" | "FALHA" | "SINCRONIZANDO" | "DESABILITADO";
export type SourceOrigin = "PUBLICO" | "SINTETICO" | "MANUAL" | "CALCULADO";
export type ExternalProcessingStatus = "PENDING" | "ACCEPTED" | "UPDATED" | "DUPLICATE" | "REJECTED" | "QUARANTINED";

export interface SourceMetadata {
  sourceSystem: string;
  sourceRecordId: string;
  occurredAt: string;
  recordedAt: string;
  confidence: number;
  schemaVersion: string;
  dataNature: DataNature;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserScope {
  userId: string;
  organizationId: string;
  supplyClass: string;
  role: Role;
  validFrom: string;
  validUntil?: string;
  active: boolean;
}

export interface Organization {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
  synthetic: boolean;
  active: boolean;
}

export interface SupplyItem {
  id: string;
  persistentCode: string;
  name: string;
  description: string;
  supplyClass: string;
  category: string;
  baseUnit: string;
  active: boolean;
  synthetic: boolean;
  sourceSystem?: string;
  sourceRecordId?: string;
  sourceOrigin?: SourceOrigin;
  sourceUpdatedAt?: string;
}

export interface ItemVariant {
  id: string;
  itemId: string;
  sku: string;
  label: string;
  size: string;
  unit: string;
  active: boolean;
}

export interface Need extends SourceMetadata {
  id: string;
  persistentCode: string;
  organizationId: string;
  itemVariantId: string;
  quantityRequested: number;
  quantityApproved: number;
  priority: "CRITICA" | "ALTA" | "MEDIA" | "BAIXA";
  requiredAt: string;
  purpose: string;
  status: string;
  authorityLevel: string;
  createdAt: string;
  updatedAt: string;
}

export interface Credit extends SourceMetadata {
  id: string;
  persistentCode: string;
  amount: number;
  availableAmount: number;
  planningCode: string;
  expenseNature: string;
  expiresAt: string;
  status: string;
}

export interface AcquisitionInstrument extends Omit<SourceMetadata, "occurredAt" | "recordedAt" | "confidence" | "schemaVersion" | "dataNature"> {
  id: string;
  persistentCode: string;
  type: string;
  reference: string;
  supplierNameSynthetic: string;
  supplierName?: string;
  supplierDocument?: string;
  organizationName?: string;
  organizationCode?: string;
  itemDescription?: string;
  itemCode?: string;
  quantity?: number;
  unitValue?: number;
  totalValue?: number;
  sourceOrigin?: SourceOrigin;
  sourceUrl?: string;
  externalReference?: string;
  lastSourceUpdateAt?: string;
  confidence?: number;
  validFrom: string;
  validUntil: string;
  capacity: number;
  status: string;
}

export interface Commitment extends Omit<SourceMetadata, "occurredAt" | "recordedAt" | "schemaVersion" | "dataNature"> {
  id: string;
  persistentCode: string;
  creditId: string;
  acquisitionInstrumentId: string;
  amount: number;
  issuedAt: string;
  status: string;
}

export interface NeedCoverage {
  id: string;
  needId: string;
  coverageType: "ESTOQUE" | "AQUISICAO" | "TRANSFERENCIA";
  quantity: number;
  creditId?: string;
  commitmentId?: string;
  status: string;
}

export interface Lot {
  id: string;
  persistentCode: string;
  itemVariantId: string;
  quantity: number;
  manufacturedAt?: string;
  receivedAt?: string;
  supplierReferenceSynthetic: string;
  status: string;
}

export interface Location {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  type: string;
  synthetic: boolean;
}

export interface LogisticsUnit extends SourceMetadata {
  id: string;
  persistentCode: string;
  lotId: string;
  itemVariantId: string;
  quantity: number;
  unit: string;
  qrToken: string;
  currentState: LogisticsUnitState;
  currentLocationId: string;
  condition: string;
  sourceEventId?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shipment {
  id: string;
  persistentCode: string;
  originOrganizationId: string;
  destinationOrganizationId: string;
  plannedDepartureAt: string;
  actualDepartureAt?: string;
  expectedDeliveryAt: string;
  actualDeliveryAt?: string;
  status: string;
  transportReferenceSynthetic: string;
  confidence: number;
}

export interface ShipmentUnit {
  shipmentId: string;
  logisticsUnitId: string;
  quantity: number;
}

export interface DocumentReference {
  id: string;
  title: string;
  documentType: string;
  repository: string;
  externalReference: string;
  classificationLabel: string;
  synthetic: boolean;
  checksum?: string;
  createdAt: string;
}

export interface ObjectLink {
  id: string;
  fromType: string;
  fromId: string;
  relationType: string;
  toType: string;
  toId: string;
  sourceSystem: string;
  sourceRecordId: string;
  actorId?: string;
  justification?: string;
  confidence?: number;
  sourceOrigin?: SourceOrigin;
  createdAt: string;
}

export interface LogisticsEvent extends SourceMetadata {
  id: string;
  persistentCode: string;
  eventType: EventType;
  objectType: string;
  objectId: string;
  quantity: number;
  unit: string;
  locationId?: string;
  condition?: string;
  actorId: string;
  idempotencyKey: string;
  authorityLevel: string;
  payload: Record<string, unknown>;
  correctionOfEventId?: string;
  createdAt: string;
}

export interface EventRelation {
  eventId: string;
  relatedObjectType: string;
  relatedObjectId: string;
  relationType: string;
}

export interface Divergence {
  id: string;
  persistentCode: string;
  title: string;
  severity: "BAIXA" | "MEDIA" | "ALTA" | "CRITICA";
  status: "ABERTA" | "CORRIGIDA" | "EM_ANALISE";
  objectType: string;
  objectId: string;
  expected: string;
  observed: string;
  sourceSystem: string;
  sourceRecordId: string;
  confidence: number;
  detectedAt: string;
  correctedByEventId?: string;
}

export interface ConnectorHealth {
  id: string;
  name: string;
  sourceSystem: string;
  status: ConnectorStatus;
  lastRunAt: string;
  lastSuccessAt?: string;
  latencyMs: number;
  recordsImported: number;
  quarantinedRecords: number;
  message: string;
  endpoint?: string;
  recordsRead?: number;
  acceptedRecords?: number;
  updatedRecords?: number;
  duplicateRecords?: number;
  rejectedRecords?: number;
  durationMs?: number;
  mappingVersion?: string;
  lastRunId?: string;
}

export interface QuarantineRecord {
  id: string;
  sourceSystem: string;
  sourceRecordId: string;
  reason: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  occurredAt: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  organizationId?: string;
  requestId: string;
  sourceIpHash?: string;
  userAgent: string;
  outcome: "SUCESSO" | "NEGADO" | "ERRO";
  reason: string;
  metadata: Record<string, unknown>;
}

export interface ExternalRecord {
  id: string;
  connectorId: string;
  externalType: string;
  externalId: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  schemaVersion: string;
  payload: Record<string, unknown>;
  payloadHash: string;
  processingStatus: ExternalProcessingStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorRun {
  id: string;
  connectorId: string;
  status: "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED";
  startedAt: string;
  finishedAt?: string;
  endpoint: string;
  recordsRead: number;
  acceptedRecords: number;
  updatedRecords: number;
  duplicateRecords: number;
  rejectedRecords: number;
  quarantinedRecords: number;
  durationMs: number;
  mappingVersion: string;
  message: string;
}

export interface MulticriteriaWeights {
  id: string;
  version: string;
  urgency: number;
  operationalImpact: number;
  stockRisk: number;
  logisticsLeadTime: number;
  financialCoverage: number;
  acceptedByHuman?: boolean;
  humanJustification?: string;
}

export interface DemoState {
  users: User[];
  userScopes: UserScope[];
  organizations: Organization[];
  supplyItems: SupplyItem[];
  itemVariants: ItemVariant[];
  needs: Need[];
  credits: Credit[];
  acquisitionInstruments: AcquisitionInstrument[];
  commitments: Commitment[];
  needCoverages: NeedCoverage[];
  lots: Lot[];
  locations: Location[];
  logisticsUnits: LogisticsUnit[];
  shipments: Shipment[];
  shipmentUnits: ShipmentUnit[];
  documents: DocumentReference[];
  objectLinks: ObjectLink[];
  externalRecords: ExternalRecord[];
  connectorRuns: ConnectorRun[];
  events: LogisticsEvent[];
  eventRelations: EventRelation[];
  divergences: Divergence[];
  connectors: ConnectorHealth[];
  quarantine: QuarantineRecord[];
  auditLogs: AuditLog[];
  multicriteriaWeights: MulticriteriaWeights[];
}
