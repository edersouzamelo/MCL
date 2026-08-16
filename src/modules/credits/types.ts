export type ExpenseNatureCode = "339030" | "449052" | "339039" | "339036" | "449051";

export type ResourceSourceCode = "0100" | "0142" | "0180" | "0300" | "0150";

export type BudgetExecutionStatus = "DISPONIVEL" | "EM_EXECUCAO" | "COMPROMETIDO" | "BLOQUEADO" | "ESGOTADO";

export type CommitmentStatus = "EMITIDO" | "LIQUIDADO" | "PAGO" | "CANCELADO" | "PARCIALMENTE_LIQUIDADO";

export interface BudgetProgram {
  code: string; // PTRES (ex: 172948)
  actionCode: string; // Ação Orçamentária (ex: 2000, 2021)
  name: string;
  subprogram: string;
}

export interface CreditRecord {
  id: string;
  persistentCode: string; // ex: MCL-CRED-2026-0001
  ugCode: string; // UG Emitente (ex: 160001 - COLOG)
  ugName: string; // Nome da UG
  organizationId: string;
  financialYear: number; // 2026
  planningCode: string; // PI - Plano Interno
  budgetProgramCode: string; // PTRES
  budgetProgramName: string;
  expenseNature: ExpenseNatureCode; // ND (ex: 339030 - Material de Consumo)
  expenseNatureLabel: string;
  resourceSource: ResourceSourceCode; // Fonte (ex: 0100 - Recursos Ordinários)
  resourceSourceLabel: string;
  initialAmount: number; // Dotação Inicial
  supplementedAmount: number; // Suplementação (+)
  canceledAmount: number; // Anulação (-)
  totalAmount: number; // Dotação Atualizada (Inicial + Suplementado - Anulado)
  committedAmount: number; // Empenhado
  liquidatedAmount: number; // Liquidado
  paidAmount: number; // Pago
  availableAmount: number; // Saldo Disponível (Dotação Atualizada - Empenhado)
  status: BudgetExecutionStatus;
  expiresAt: string;
  sourceSystem: string;
  sourceRecordId: string;
  dataNature: "validado" | "informado" | "calculado" | "estimado" | "divergente";
  occurredAt: string;
  recordedAt: string;
}

export interface CommitmentRecord {
  id: string;
  neCode: string; // Código da NE no SIAFI (ex: 2026NE000123)
  persistentCode: string;
  creditId: string;
  ugCode: string;
  ugName: string;
  acquisitionInstrumentId?: string; // Vínculo com ARP ou Contrato
  acquisitionInstrumentRef?: string; // ex: ARP-2026-0001
  needId?: string; // Vínculo com Necessidade MCL
  needItemDescription?: string; // ex: Coturno de Couro Preto Tam 42
  supplierName: string; // Favorecido
  supplierDocument: string; // CNPJ / CPF
  expenseNature: ExpenseNatureCode;
  resourceSource: ResourceSourceCode;
  committedAmount: number; // Valor Empenhado
  liquidatedAmount: number; // Valor Liquidado
  paidAmount: number; // Valor Pago
  balanceAmount: number; // Saldo do Empenho (Empenhado - Pago)
  issuedAt: string;
  status: CommitmentStatus;
  sourceSystem: string; // SIAFI_STN
  sourceRecordId: string;
  confidence: number;
}

export interface BudgetExecutionSummary {
  financialYear: number;
  totalInitial: number;
  totalSupplemented: number;
  totalCanceled: number;
  totalUpdated: number; // Dotação Atualizada
  totalCommitted: number; // Total Empenhado
  totalLiquidated: number; // Total Liquidado
  totalPaid: number; // Total Pago
  totalAvailable: number; // Saldo Disponível Total
  executionPercentageCommitted: number; // % Empenhado / Dotação Atualizada
  executionPercentagePaid: number; // % Pago / Dotação Atualizada
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
  month: string; // "Jan", "Fev", "Mar", etc.
  empenhado: number;
  liquidado: number;
  pago: number;
}

export interface CoverageFinancialMatrixItem {
  needId: string;
  needCode: string;
  itemDescription: string;
  requestedQuantity: number;
  estimatedTotalValue: number; // Necessidade em R$
  creditPersistentCode?: string;
  creditAvailableAmount?: number;
  neCode?: string;
  neCommittedAmount?: number;
  financialCoveragePercentage: number; // % do valor financeiro coberto
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
