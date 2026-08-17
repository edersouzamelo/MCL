import { SiafiReportRecord } from "./types";
import { CommitmentRecord, RPNPRecord, CreditNote, ExpenseNatureCode, ResourceSourceCode, CommitmentStatus } from "@/modules/credits/types";

let globalIngestedRecords: SiafiReportRecord[] = [];
let lastIngestedAt: string | null = null;
let lastFilename: string | null = null;

const UG_NAMES: Record<string, string> = {
  "160136": "COMANDO DO 9º GRUPAMENTO LOGÍSTICO",
  "160142": "9º BATALHÃO DE SUPRIMENTO",
  "160513": "9º BATALHÃO DE MANUTENÇÃO - PATRIMONIAL",
};

export function setIngestedSiafiRecords(records: SiafiReportRecord[], filename: string) {
  globalIngestedRecords = records;
  lastIngestedAt = new Date().toISOString();
  lastFilename = filename;
}

export function getIngestedSiafiRecords(): SiafiReportRecord[] {
  return globalIngestedRecords;
}

export function getIngestionMetadata() {
  return {
    count: globalIngestedRecords.length,
    lastIngestedAt,
    lastFilename,
  };
}

export function hasIngestedSiafiData(): boolean {
  return globalIngestedRecords.length > 0;
}

export function mapSiafiToCommitmentRecords(): CommitmentRecord[] {
  return globalIngestedRecords
    .filter((r) => !r.isRPNP)
    .map((r, idx) => {
      const ugName = UG_NAMES[r.ugCode] || `UG ${r.ugCode}`;
      const isRpcm = idx % 2 === 0;
      const expenseNature = (r.expenseNature as ExpenseNatureCode) || "339030";
      const resourceSource = (r.resourceSource as ResourceSourceCode) || "0100000000";

      return {
        id: `siafi-ne-${idx + 1}`,
        neCode: r.neCode,
        persistentCode: `MCL-NE-SIAFI-${idx + 1}`,
        ownerType: isRpcm ? "RPCM" : "REQUISITANTE",
        ugCode: r.ugCode,
        ugName,
        planningCode: r.planningCode || "PI-MCL-2026",
        needItemDescription: `Item da NE ${r.neCode} (${r.expenseNature})`,
        supplierName: r.supplierName || "FORNECEDOR CADASTRADO",
        supplierDocument: "00.000.000/0001-99",
        expenseNature,
        resourceSource,
        committedAmount: r.amount,
        liquidatedAmount: r.amount * 0.8,
        paidAmount: r.amount * 0.75,
        balanceAmount: r.amount * 0.2,
        issuedAt: "2026-02-10",
        status: "EMITIDO" as CommitmentStatus,
        sourceSystem: "SIAFI_TESOURO_GERENCIAL",
        sourceRecordId: `tg-${r.neCode}`,
        confidence: 1.0,
      };
    });
}

export function mapSiafiToRPNPRecords(): RPNPRecord[] {
  return globalIngestedRecords
    .filter((r) => r.isRPNP)
    .map((r, idx) => {
      const ugName = UG_NAMES[r.ugCode] || `UG ${r.ugCode}`;
      const isRpcm = idx % 2 === 0;
      const expenseNature = (r.expenseNature as ExpenseNatureCode) || "339030";
      const resourceSource = (r.resourceSource as ResourceSourceCode) || "0100000000";

      return {
        id: `siafi-rpnp-${idx + 1}`,
        rpnpCode: r.neCode,
        neCode: r.neCode,
        ownerType: isRpcm ? "RPCM" : "REQUISITANTE",
        enrollmentYear: r.neYearIssued || 2025,
        ugCode: r.ugCode,
        ugName,
        supplierName: r.supplierName || "FORNECEDOR RPNP",
        supplierDocument: "11.111.111/0001-11",
        expenseNature,
        resourceSource,
        enrolledAmount: r.amount,
        liquidatedAmount: r.amount * 0.6,
        paidAmount: r.amount * 0.5,
        canceledAmount: 0,
        balanceAmount: r.amount * 0.4,
        status: "EM_LIQUIDACAO",
      };
    });
}

export function mapSiafiToCreditNotes(): CreditNote[] {
  const ugMap = new Map<string, number>();
  globalIngestedRecords.forEach((r) => {
    const key = `${r.ugCode}-${r.planningCode}`;
    ugMap.set(key, (ugMap.get(key) || 0) + r.amount);
  });

  const notes: CreditNote[] = [];
  let count = 1;

  ugMap.forEach((totalAmount, key) => {
    const [ugCode, planningCode] = key.split("-");
    const ugName = UG_NAMES[ugCode] || `UG ${ugCode}`;
    const isRpcm = count % 2 === 0;

    notes.push({
      id: `siafi-nc-${count}`,
      ncCode: `2026NC00${100 + count}`,
      persistentCode: `MCL-NC-SIAFI-${count}`,
      ownerType: isRpcm ? "RPCM" : "REQUISITANTE",
      ugIssuerCode: "160091",
      ugIssuerName: "DEPÓSITO CENTRAL",
      ugReceiverCode: ugCode,
      ugReceiverName: ugName,
      planningCode: planningCode || "PI-MCL-2026",
      budgetProgramCode: "2000",
      budgetProgramName: "Ação 2000 - Suprimento de Intendência",
      expenseNature: "339030" as ExpenseNatureCode,
      resourceSource: "0100000000" as ResourceSourceCode,
      amount: totalAmount,
      availableBalance: totalAmount * 0.35,
      issuedAt: "2026-01-15",
      status: "DESCENTRALIZADA",
      sourceSystem: "SIAFI_TESOURO_GERENCIAL",
    });
    count++;
  });

  return notes;
}
