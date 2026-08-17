export interface SiafiReportRecord {
  ugCode: string;
  ugName?: string;
  planningCode: string; // PI
  neCode: string;
  neYearIssued?: number; // NE CCor - Ano Emissão
  supplierDocument?: string;
  supplierName?: string; // NE CCor - Favorecido
  expenseNature: string; // Natureza Despesa Detalhada (ex: 339030)
  resourceSource?: string;
  amount: number; // Movim. Líquido - R$
  isRPNP: boolean;
}

export interface SiafiIngestionResult {
  success: boolean;
  sourceFilename: string;
  totalRecordsProcessed: number;
  creditsUpdatedCount: number;
  commitmentsUpdatedCount: number;
  rpnpsUpdatedCount: number;
  errors: string[];
  ingestedAt: string;
}

export interface SiafiSyncStatus {
  lastSyncAt: string | null;
  status: "IDLE" | "SYNCING" | "SUCCESS" | "ERROR";
  totalSyncs: number;
  lastReportName: string | null;
  lastRecordCount: number;
}
