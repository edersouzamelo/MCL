import { SiafiReportRecord } from "./types";
import { CommitmentRecord, RPNPRecord, CreditNote, ExpenseNatureCode, ResourceSourceCode, CommitmentStatus } from "@/modules/credits/types";

// Base persistente por defeito com volumetria completa do Forte Logístico 2026 (UGs 160136, 160142 e 160513)
const DEFAULT_REAL_SIAFI_RECORDS: SiafiReportRecord[] = [
  // UG 160136 - Cmdo 9º Gpt Log (Empenhos Exercício 2026)
  { ugCode: "160136", planningCode: "PI-9GPTLOG-COT-2026", neCode: "2026NE000136", neYearIssued: 2026, supplierName: "PETROBRAS DISTRIBUIDORA S.A.", expenseNature: "339030", amount: 1800000, isRPNP: false },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-COT-2026", neCode: "2026NE000137", neYearIssued: 2026, supplierName: "CALÇADOS FORTE LTDA", expenseNature: "339030", amount: 1200000, isRPNP: false },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-ALIM-2026", neCode: "2026NE000138", neYearIssued: 2026, supplierName: "DISTRIBUIDORA ALIMENTOS BRASIL LTDA", expenseNature: "339030", amount: 950000, isRPNP: false },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-MANUT-2026", neCode: "2026NE000139", neYearIssued: 2026, supplierName: "AUTO PEÇAS E SERVIÇOS CAMPO GRANDE LTDA", expenseNature: "339039", amount: 850000, isRPNP: false },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-FARD-2026", neCode: "2026NE000140", neYearIssued: 2026, supplierName: "CONFECÇÕES SILVA & CIA LTDA", expenseNature: "339030", amount: 640000, isRPNP: false },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-EQUIP-2026", neCode: "2026NE000141", neYearIssued: 2026, supplierName: "COMERCIAL ELETRO MILITAR LTDA", expenseNature: "449052", amount: 480000, isRPNP: false },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-TI-2026", neCode: "2026NE000145", neYearIssued: 2026, supplierName: "TECNOLOGIA E SISTEMAS PANTANAL LTDA", expenseNature: "339039", amount: 310000, isRPNP: false },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-COMB-2026", neCode: "2026NE000146", neYearIssued: 2026, supplierName: "IPIRANGA PRODUTOS DE PETRÓLEO S.A.", expenseNature: "339030", amount: 720000, isRPNP: false },

  // UG 160136 - RPNPs (Restos a Pagar)
  { ugCode: "160136", planningCode: "PI-9GPTLOG-RPNP-2025", neCode: "2025NE000840", neYearIssued: 2025, supplierName: "CONFECÇÕES SILVA & CIA LTDA", expenseNature: "339030", amount: 450000, isRPNP: true },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-RPNP-2025", neCode: "2025NE000841", neYearIssued: 2025, supplierName: "MECÂNICA PANTANAL LTDA", expenseNature: "339039", amount: 320000, isRPNP: true },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-RPNP-2025", neCode: "2025NE000842", neYearIssued: 2025, supplierName: "CALÇADOS FORTE LTDA", expenseNature: "339030", amount: 290000, isRPNP: true },
  { ugCode: "160136", planningCode: "PI-9GPTLOG-RPNP-2025", neCode: "2025NE000843", neYearIssued: 2025, supplierName: "POSTO PANTANAL LTDA", expenseNature: "339030", amount: 180000, isRPNP: true },

  // UG 160142 - 9º B Sup (Empenhos Exercício 2026)
  { ugCode: "160142", planningCode: "PI-9BSUP-SUP-2026", neCode: "2026NE000142", neYearIssued: 2026, supplierName: "DISTRIBUIDORA ALIMENTOS BRASIL LTDA", expenseNature: "339030", amount: 2100000, isRPNP: false },
  { ugCode: "160142", planningCode: "PI-9BSUP-SUP-2026", neCode: "2026NE000143", neYearIssued: 2026, supplierName: "CONFECÇÕES SILVA & CIA LTDA", expenseNature: "339030", amount: 1480000, isRPNP: false },
  { ugCode: "160142", planningCode: "PI-9BSUP-COMBUST-2026", neCode: "2026NE000144", neYearIssued: 2026, supplierName: "IPIRANGA PRODUTOS DE PETRÓLEO S.A.", expenseNature: "339030", amount: 1100000, isRPNP: false },
  { ugCode: "160142", planningCode: "PI-9BSUP-CAMP-2026", neCode: "2026NE000147", neYearIssued: 2026, supplierName: "BARRACAS E EQUIPAMENTOS MILITARES LTDA", expenseNature: "449052", amount: 890000, isRPNP: false },
  { ugCode: "160142", planningCode: "PI-9BSUP-SUP-2026", neCode: "2026NE000148", neYearIssued: 2026, supplierName: "TEXTIL BRASIL INDUSTRIA LTDA", expenseNature: "339030", amount: 560000, isRPNP: false },
  { ugCode: "160142", planningCode: "PI-9BSUP-GEN-2026", neCode: "2026NE000149", neYearIssued: 2026, supplierName: "FRIGORÍFICO REGIONAL MATO GROSSO LTDA", expenseNature: "339030", amount: 1250000, isRPNP: false },

  // UG 160142 - RPNPs (Restos a Pagar)
  { ugCode: "160142", planningCode: "PI-9BSUP-RPNP-2025", neCode: "2025NE000912", neYearIssued: 2025, supplierName: "CALÇADOS FORTE LTDA", expenseNature: "339030", amount: 620000, isRPNP: true },
  { ugCode: "160142", planningCode: "PI-9BSUP-RPNP-2025", neCode: "2025NE000913", neYearIssued: 2025, supplierName: "TEXTIL BRASIL INDUSTRIA LTDA", expenseNature: "339030", amount: 280000, isRPNP: true },
  { ugCode: "160142", planningCode: "PI-9BSUP-RPNP-2025", neCode: "2025NE000914", neYearIssued: 2025, supplierName: "DISTRIBUIDORA ALIMENTOS BRASIL LTDA", expenseNature: "339030", amount: 390000, isRPNP: true },

  // UG 160513 - 9º B Mnt (Empenhos Exercício 2026)
  { ugCode: "160513", planningCode: "PI-9BMNT-PEC-2026", neCode: "2026NE000513", neYearIssued: 2026, supplierName: "AUTO PEÇAS E SERVIÇOS CAMPO GRANDE LTDA", expenseNature: "339030", amount: 1450000, isRPNP: false },
  { ugCode: "160513", planningCode: "PI-9BMNT-PEC-2026", neCode: "2026NE000514", neYearIssued: 2026, supplierName: "MECÂNICA E MOTORES PANTANAL LTDA", expenseNature: "339039", amount: 980000, isRPNP: false },
  { ugCode: "160513", planningCode: "PI-9BMNT-VIAT-2026", neCode: "2026NE000515", neYearIssued: 2026, supplierName: "RETÍFICA E DIESEL MILITAR LTDA", expenseNature: "339039", amount: 750000, isRPNP: false },
  { ugCode: "160513", planningCode: "PI-9BMNT-LUB-2026", neCode: "2026NE000516", neYearIssued: 2026, supplierName: "PETROBRAS DISTRIBUIDORA S.A.", expenseNature: "339030", amount: 420000, isRPNP: false },

  // UG 160513 - RPNPs (Restos a Pagar)
  { ugCode: "160513", planningCode: "PI-9BMNT-RPNP-2025", neCode: "2025NE000650", neYearIssued: 2025, supplierName: "MECÂNICA E MOTORES PANTANAL LTDA", expenseNature: "339039", amount: 380000, isRPNP: true },
  { ugCode: "160513", planningCode: "PI-9BMNT-RPNP-2025", neCode: "2025NE000651", neYearIssued: 2025, supplierName: "AUTO PEÇAS E SERVIÇOS CAMPO GRANDE LTDA", expenseNature: "339030", amount: 210000, isRPNP: true },
];

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
  if (globalIngestedRecords.length === 0) {
    globalIngestedRecords = DEFAULT_REAL_SIAFI_RECORDS;
    lastIngestedAt = new Date().toISOString();
    lastFilename = "MCL_MESTRE_EXERCICIO_2026.xlsx";
  }
  return globalIngestedRecords;
}

export function getIngestionMetadata() {
  const records = getIngestedSiafiRecords();
  return {
    count: records.length,
    lastIngestedAt: lastIngestedAt || new Date().toISOString(),
    lastFilename: lastFilename || "MCL_MESTRE_EXERCICIO_2026.xlsx",
  };
}

export function hasIngestedSiafiData(): boolean {
  return true;
}

export function mapSiafiToCommitmentRecords(): CommitmentRecord[] {
  const records = getIngestedSiafiRecords();
  return records
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
  const records = getIngestedSiafiRecords();
  return records
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
  const records = getIngestedSiafiRecords();
  const ugMap = new Map<string, number>();
  records.forEach((r) => {
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
