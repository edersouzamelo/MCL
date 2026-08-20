import {
  computeRpnSnapshot,
  type RpnFinancialValues,
  type RpnRow,
  type RpnSnapshot,
} from "@/modules/grupamento/rpn";
import {
  computeSagSnapshot,
  type SagFinancialValues,
  type SagRow,
  type SagSnapshot,
} from "@/modules/grupamento/sag";

export type CcoLayoutId = "mcl" | "ccol";

export const CCO_RULE_SOURCE = {
  fileName: "algoritmo.xlsx",
  referenceDate: "19 AGO 26",
  description: "Matriz PI → Classe e baseline Previsto fornecidos pelo CCOL",
} as const;

export type CcoClassGroup = {
  id: string;
  classId: CcoClassId;
  label: string;
  piCodes: string[];
  planned?: number;
  plannedLabel?: string;
};

export type CcoClassId =
  | "class-i"
  | "class-ii"
  | "class-iii"
  | "class-v"
  | "class-viii"
  | "class-ix"
  | "class-diversas";

export const CCO_CLASS_SLIDES: Array<{
  id: CcoClassId;
  label: string;
  title: string;
  subtitle: string;
}> = [
  { id: "class-i", label: "Classe I", title: "Classe I", subtitle: "Subsistência, reserva regional, PASA e manutenção operacional" },
  { id: "class-ii", label: "Classe II", title: "Classe II", subtitle: "Material de Intendência" },
  { id: "class-iii", label: "Classe III", title: "Classe III", subtitle: "Óleos e lubrificantes" },
  { id: "class-v", label: "Classe V", title: "Classe V", subtitle: "Munição, paióis e armamento" },
  { id: "class-viii", label: "Classe VIII", title: "Classe VIII", subtitle: "Saúde" },
  { id: "class-ix", label: "Classe IX", title: "Classe IX", subtitle: "Manutenção corretiva e preventiva" },
  { id: "class-diversas", label: "Finalidades diversas", title: "Finalidades diversas", subtitle: "Remonta/Veterinária e Transporte" },
];

export const CCO_CLASS_GROUPS: CcoClassGroup[] = [
  {
    id: "i-qs",
    classId: "class-i",
    label: "QS",
    planned: 21530740,
    piCodes: ["E6SUPLJA2QS", "E6SUPLJQSEE", "E6SUPLJQSFR", "E6SUSOLA2QS", "E6SUSOLOPQS"],
  },
  {
    id: "i-qr",
    classId: "class-i",
    label: "QR",
    planned: 18926215,
    piCodes: ["E6SUPLJA1QR", "E6SUPLJA3RR", "E6SUPLJA4QR", "E6SUPLJESCO", "E6SUPLJTRFR", "E6SUSOLA1QR", "E6SUSOLOPQR", "E6SUSOLSOLE"],
  },
  {
    id: "i-res-reg",
    classId: "class-i",
    label: "Reserva Regional",
    planned: 567786.45,
    piCodes: ["E6SUPLJA3RR"],
  },
  {
    id: "i-mnt-op",
    classId: "class-i",
    label: "Mnt OP",
    planned: 657760,
    piCodes: ["E6SUPLJA6OP"],
  },
  {
    id: "i-pasa",
    classId: "class-i",
    label: "PASA",
    planned: 3171516.38,
    piCodes: ["E6SUPLJA5PA", "E6SUPLJA7PA", "E6SUSOLA5CF", "E6SUSOLA5PA"],
  },
  {
    id: "i-mnt-rancho",
    classId: "class-i",
    label: "Mnt Rancho",
    planned: 217000,
    plannedLabel: "PI pendente na matriz-fonte",
    piCodes: [],
  },
  {
    id: "ii-intendencia",
    classId: "class-ii",
    label: "Intendência",
    planned: 786503.43,
    piCodes: ["E6MIPLJBIDS", "E6MIPLJFM20", "E6MIPLJMNOP", "E6MIPLJUESC", "E6MIPLJUESP", "E6MISOLBIDS", "E6MISOLFM20", "E6MISOLMNOP", "E6MISOLOUTR", "E6MISOLPUBL", "E6MISOLUHIS", "E6MIPLJFDOB"],
  },
  {
    id: "iii-lubrificantes",
    classId: "class-iii",
    label: "Óleos e lubrificantes AR/MB/MM",
    planned: 578329,
    piCodes: ["E5MBPDRCOLU", "E5ARPDRCOLU", "E5MMPDRCOLU"],
  },
  {
    id: "v-mun",
    classId: "class-v",
    label: "Mnt Paióis / Munição",
    planned: 40000,
    piCodes: ["E6MUPLJDEPA", "E6MUSOLDEPA", "E6MUSOLDIAR", "E6MUSOLPASS"],
  },
  {
    id: "v-armt",
    classId: "class-v",
    label: "Armamento",
    planned: 136528,
    piCodes: ["E5ARPDRDEGE", "E5ARSUNPREV", "E5ARSUNARMA"],
  },
  {
    id: "viii-saude",
    classId: "class-viii",
    label: "Saúde",
    piCodes: ["D8SAFCTACL8"],
    plannedLabel: "Previsto não informado na tabela-fonte",
  },
  {
    id: "ix-corr",
    classId: "class-ix",
    label: "Corretiva",
    planned: 1691611,
    piCodes: ["E5MBGRMDEGE", "E5MBPDRDEGE", "E5MBSUNCOMP", "E5MBSUNDIAR", "E5MBSUNOUTR", "E5MBSUNPASS", "E5MMGRMDEGE", "E5MMPDRDEGE", "E5MMSUNCOMP", "E5MMSUNDIAR", "E5MMSUNOUTR", "E5PCFSCMNTV", "FGA121XDEG", "FGA124XMMNT", "OCS70003000", "OCS70003001", "OCS70023001"],
  },
  {
    id: "ix-prev",
    classId: "class-ix",
    label: "Preventiva",
    plannedLabel: "EXTRA",
    piCodes: ["E5MBSUNPREV", "E5MMSUNPREV"],
  },
  {
    id: "div-rv",
    classId: "class-diversas",
    label: "Remonta / Veterinária",
    planned: 985318.5,
    piCodes: ["E6RVPLJALIC", "E6RVPLJALIE", "E6RVPLJFER3", "E6RVPLJMTOC", "E6RVPLJMTOE", "E6RVPLJOUT4", "E6RVSOLMTOE", "E6RVSOLOUT4"],
  },
  {
    id: "div-trnp",
    classId: "class-diversas",
    label: "Transporte",
    planned: 768000,
    piCodes: ["E7DATRSAPIO", "E7DATRSDIAR", "E7DATRSPASS"],
  },
];

export type CcoGroupExecution = {
  group: CcoClassGroup;
  current: SagSnapshot;
  previous: RpnSnapshot;
  matchedCurrentRows: number;
  matchedPreviousRows: number;
};

export type CcoClassExecution = {
  classId: CcoClassId;
  current: SagSnapshot;
  previous: RpnSnapshot;
  groups: CcoGroupExecution[];
  plannedKnownTotal: number;
  plannedComplete: boolean;
  matchedCurrentRows: number;
  matchedPreviousRows: number;
};

function normalizePi(value?: string) {
  return value?.trim().toUpperCase() ?? "";
}

function sumSagRows(rows: SagRow[]): SagSnapshot {
  return computeSagSnapshot(
    rows.reduce<SagFinancialValues>(
      (acc, row) => ({
        available: acc.available + row.available,
        toLiquidate: acc.toLiquidate + row.toLiquidate,
        inLiquidation: acc.inLiquidation + row.inLiquidation,
        liquidated: acc.liquidated + row.liquidated,
        paid: acc.paid + row.paid,
      }),
      { available: 0, toLiquidate: 0, inLiquidation: 0, liquidated: 0, paid: 0 },
    ),
  );
}

function sumRpnRows(rows: RpnRow[]): RpnSnapshot {
  return computeRpnSnapshot(
    rows.reduce<RpnFinancialValues>(
      (acc, row) => ({
        toLiquidate: acc.toLiquidate + row.toLiquidate,
        liquidated: acc.liquidated + row.liquidated,
        cancelled: acc.cancelled + row.cancelled,
      }),
      { toLiquidate: 0, liquidated: 0, cancelled: 0 },
    ),
  );
}

export function buildCcoClassExecution(classId: CcoClassId, sagRows: SagRow[], rpnRows: RpnRow[]): CcoClassExecution {
  const groups = CCO_CLASS_GROUPS.filter((group) => group.classId === classId).map((group) => {
    const allowed = new Set(group.piCodes);
    const currentRows = sagRows.filter((row) => allowed.has(normalizePi(row.pi)));
    const previousRows = rpnRows.filter((row) => allowed.has(normalizePi(row.pi)));
    return {
      group,
      current: sumSagRows(currentRows),
      previous: sumRpnRows(previousRows),
      matchedCurrentRows: currentRows.length,
      matchedPreviousRows: previousRows.length,
    };
  });

  const groupPiCodes = new Set(groups.flatMap(({ group }) => group.piCodes));
  const classCurrentRows = sagRows.filter((row) => groupPiCodes.has(normalizePi(row.pi)));
  const classPreviousRows = rpnRows.filter((row) => groupPiCodes.has(normalizePi(row.pi)));
  const groupsWithUnknownPlanned = groups.filter(({ group }) => group.planned === undefined);

  return {
    classId,
    current: sumSagRows(classCurrentRows),
    previous: sumRpnRows(classPreviousRows),
    groups,
    plannedKnownTotal: groups.reduce((sum, { group }) => sum + (group.planned ?? 0), 0),
    plannedComplete: groupsWithUnknownPlanned.length === 0,
    matchedCurrentRows: classCurrentRows.length,
    matchedPreviousRows: classPreviousRows.length,
  };
}

export function findUnmappedPis(rows: Array<{ pi?: string }>) {
  const mapped = new Set(CCO_CLASS_GROUPS.flatMap((group) => group.piCodes));
  return [...new Set(rows.map((row) => normalizePi(row.pi)).filter((pi) => pi && !mapped.has(pi)))].sort();
}
