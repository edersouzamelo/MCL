export type ExpenseNatureCode = "339030" | "449052" | "339039" | "339036" | "449051";

export type ResourceSourceCode = "0100" | "0142" | "0180" | "0300" | "0150";

export type BudgetExecutionStatus = "DISPONIVEL" | "EM_EXECUCAO" | "COMPROMETIDO" | "BLOQUEADO" | "ESGOTADO";

export type CommitmentStatus = "EMITIDO" | "LIQUIDADO" | "PAGO" | "CANCELADO" | "PARCIALMENTE_LIQUIDADO";

export type ModuleOwnerType = "REQUISITANTE" | "RPCM";

export interface CreditRecord {
  id: string;
  persistentCode: string;
  ugCode: string;
  ugName: string;
  organizationId: string;
  financialYear: number;
  planningCode: string;
  budgetProgramCode: string;
  budgetProgramName: string;
  expenseNature: ExpenseNatureCode;
  expenseNatureLabel: string;
  resourceSource: ResourceSourceCode;
  resourceSourceLabel: string;
  initialAmount: number;
  supplementedAmount: number;
  canceledAmount: number;
  totalAmount: number;
  committedAmount: number;
  liquidatedAmount: number;
  paidAmount: number;
  availableAmount: number;
  status: BudgetExecutionStatus;
  expiresAt: string;
  sourceSystem: string;
  sourceRecordId: string;
  dataNature: "validado" | "informado" | "calculado" | "estimado" | "divergente";
  occurredAt: string;
  recordedAt: string;
}

export interface CreditNote {
  id: string;
  ncCode: string; // ex: 2026NC000412
  persistentCode: string;
  ownerType: ModuleOwnerType; // REQUISITANTE ou RPCM
  ugIssuerCode: string; // UG Emitente
  ugIssuerName: string;
  ugReceiverCode: string; // UG Favorecida / Recebedora
  ugReceiverName: string;
  planningCode: string; // PI - Plano Interno
  budgetProgramCode: string; // PTRES
  budgetProgramName: string;
  expenseNature: ExpenseNatureCode;
  resourceSource: ResourceSourceCode;
  amount: number; // Valor da NC
  availableBalance: number; // Saldo Disponível na NC
  issuedAt: string;
  status: string;
  sourceSystem: string;
}

export interface CommitmentRecord {
  id: string;
  neCode: string; // ex: 2026NE000123
  persistentCode: string;
  ownerType: ModuleOwnerType; // REQUISITANTE ou RPCM
  creditId?: string;
  ncCode?: string;
  ugCode: string;
  ugName: string;
  acquisitionInstrumentId?: string;
  acquisitionInstrumentRef?: string; // ex: ARP-2026-0001
  needId?: string;
  needItemDescription?: string;
  supplierName: string;
  supplierDocument: string;
  expenseNature: ExpenseNatureCode;
  resourceSource: ResourceSourceCode;
  committedAmount: number;
  liquidatedAmount: number;
  paidAmount: number;
  balanceAmount: number;
  issuedAt: string;
  status: CommitmentStatus;
  sourceSystem: string;
  sourceRecordId: string;
  confidence: number;
}

export interface RPNPRecord {
  id: string;
  rpnpCode: string; // ex: 2025NE000840 (Inscrito como RPNP em 2026)
  ownerType: ModuleOwnerType; // REQUISITANTE ou RPCM
  enrollmentYear: number; // 2025
  ugCode: string;
  ugName: string;
  supplierName: string;
  supplierDocument: string;
  expenseNature: ExpenseNatureCode;
  resourceSource: ResourceSourceCode;
  enrolledAmount: number; // Valor Inscrito
  liquidatedAmount: number; // Valor Liquidado em 2026
  paidAmount: number; // Valor Pago em 2026
  canceledAmount: number; // Valor Cancelado
  balanceAmount: number; // Saldo a Pagar de RPNP
  status: "EM_LIQUIDACAO" | "LIQUIDADO" | "PAGO" | "CANCELADO";
}

export interface SrpProcurement {
  id: string;
  ataNumber: string; // ex: ARP-2026-0012-COLOG
  processNumber: string; // ex: PE 09/2026
  managingUgCode: string; // UG Gerenciadora da Ata
  managingUgName: string;
  catmatCode: string;
  itemDescription: string;
  supplierName: string;
  supplierDocument: string;
  unitValue: number;
  registeredQuantity: number;
  committedQuantity: number;
  adhesionBalanceQuantity: number; // Saldo para Carona/Adesão
  validUntil: string;
  status: "VIGENTE" | "ENCERRADA" | "CANCELADA";
}

export interface BudgetGoal {
  id: string;
  category: "EXERCICIO" | "RPNP";
  title: string;
  targetAmount: number; // Meta em R$
  achievedAmount: number; // Realizado em R$
  percentageAchieved: number; // %
  status: "NO_RITMO" | "ATENCAO" | "CRITICO" | "CONCLUIDO";
}

export interface BudgetExecutionSummary {
  financialYear: number;
  totalInitial: number;
  totalSupplemented: number;
  totalCanceled: number;
  totalUpdated: number;
  totalCommitted: number;
  totalLiquidated: number;
  totalPaid: number;
  totalAvailable: number;
  executionPercentageCommitted: number;
  executionPercentagePaid: number;
  countCredits: number;
  countCommitments: number;
  alertsCount: number;
}

export interface ExpenseNatureBreakdown {
  code: string;
  label: string;
  totalUpdated: number;
  committed: number;
  paid: number;
  available: number;
  percentage: number;
}

export interface ResourceSourceBreakdown {
  code: string;
  label: string;
  totalUpdated: number;
  committed: number;
  paid: number;
  available: number;
}

export interface MonthlyExecutionPoint {
  month: string;
  empenhado: number;
  liquidado: number;
  pago: number;
}

export interface CoverageFinancialMatrixItem {
  needId: string;
  needCode: string;
  itemDescription: string;
  requestedQuantity: number;
  estimatedTotalValue: number;
  creditPersistentCode?: string;
  creditAvailableAmount?: number;
  neCode?: string;
  neCommittedAmount?: number;
  financialCoveragePercentage: number;
  status: "COBERTO" | "PARCIALMENTE_COBERTO" | "SEM_RECURSO" | "AGUARDANDO_EMPENHO";
}

export interface CreditFilterOptions {
  financialYear?: number;
  ugCode?: string;
  expenseNature?: string;
  resourceSource?: string;
  status?: string;
  searchQuery?: string;
}
