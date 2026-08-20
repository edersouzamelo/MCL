import type { SagRuleSet } from "@/modules/grupamento/rules";

export type CanonicalClassKey = "I" | "II" | "III" | "V" | "VIII" | "IX" | "DIVERSAS";

export type CanonicalClassGroup = {
  id: string;
  classKey: CanonicalClassKey;
  classLabel: string;
  subgroup: string;
  piCodes: string[];
  plannedBaseline?: number;
  plannedLabel?: string;
  status: "ATIVA" | "PENDENTE";
};

export const CANONICAL_RULE_SOURCE = {
  label: "algoritmo — matriz Classes / PI",
  version: "2026-08-20",
  note: "Regra fornecida pelo CCOL; correspondência somente por PI exato.",
} as const;

export const CANONICAL_CLASS_GROUPS: CanonicalClassGroup[] = [
  {
    id: "i-qs",
    classKey: "I",
    classLabel: "Classe I",
    subgroup: "QS",
    piCodes: ["E6SUPLJA2QS", "E6SUPLJQSEE", "E6SUPLJQSFR", "E6SUSOLA2QS", "E6SUSOLOPQS"],
    plannedBaseline: 21530740,
    status: "ATIVA",
  },
  {
    id: "i-qr",
    classKey: "I",
    classLabel: "Classe I",
    subgroup: "QR",
    piCodes: ["E6SUPLJA1QR", "E6SUPLJA3RR", "E6SUPLJA4QR", "E6SUPLJESCO", "E6SUPLJTRFR", "E6SUSOLA1QR", "E6SUSOLOPQR", "E6SUSOLSOLE"],
    plannedBaseline: 18926215,
    status: "ATIVA",
  },
  {
    id: "i-res-reg",
    classKey: "I",
    classLabel: "Classe I",
    subgroup: "Reserva Regional",
    piCodes: ["E6SUPLJA3RR"],
    plannedBaseline: 567786.45,
    status: "ATIVA",
  },
  {
    id: "i-mnt-op",
    classKey: "I",
    classLabel: "Classe I",
    subgroup: "Mnt OP",
    piCodes: ["E6SUPLJA6OP"],
    plannedBaseline: 657760,
    status: "ATIVA",
  },
  {
    id: "i-pasa",
    classKey: "I",
    classLabel: "Classe I",
    subgroup: "PASA",
    piCodes: ["E6SUPLJA5PA", "E6SUPLJA7PA", "E6SUSOLA5CF", "E6SUSOLA5PA"],
    plannedBaseline: 3171516.38,
    status: "ATIVA",
  },
  {
    id: "i-mnt-rancho",
    classKey: "I",
    classLabel: "Classe I",
    subgroup: "Mnt Rancho",
    piCodes: [],
    plannedBaseline: 217000,
    status: "PENDENTE",
  },
  {
    id: "ii-intendencia",
    classKey: "II",
    classLabel: "Classe II",
    subgroup: "Material de Intendência",
    piCodes: ["E6MIPLJBIDS", "E6MIPLJFM20", "E6MIPLJMNOP", "E6MIPLJUESC", "E6MIPLJUESP", "E6MISOLBIDS", "E6MISOLFM20", "E6MISOLMNOP", "E6MISOLOUTR", "E6MISOLPUBL", "E6MISOLUHIS", "E6MIPLJFDOB"],
    plannedBaseline: 786503.43,
    status: "ATIVA",
  },
  {
    id: "iii-lubrificantes",
    classKey: "III",
    classLabel: "Classe III",
    subgroup: "Óleos e Lubrificantes AR / MB / MM",
    piCodes: ["E5MBPDRCOLU", "E5ARPDRCOLU", "E5MMPDRCOLU"],
    plannedBaseline: 578329,
    status: "ATIVA",
  },
  {
    id: "v-mun",
    classKey: "V",
    classLabel: "Classe V",
    subgroup: "Munição / Mnt Paióis",
    piCodes: ["E6MUPLJDEPA", "E6MUSOLDEPA", "E6MUSOLDIAR", "E6MUSOLPASS"],
    plannedBaseline: 40000,
    status: "ATIVA",
  },
  {
    id: "v-armt",
    classKey: "V",
    classLabel: "Classe V",
    subgroup: "Armamento",
    piCodes: ["E5ARPDRDEGE", "E5ARSUNPREV", "E5ARSUNARMA"],
    plannedBaseline: 136528,
    status: "ATIVA",
  },
  {
    id: "viii-saude",
    classKey: "VIII",
    classLabel: "Classe VIII",
    subgroup: "Saúde",
    piCodes: ["D8SAFCTACL8"],
    status: "ATIVA",
  },
  {
    id: "ix-corretiva",
    classKey: "IX",
    classLabel: "Classe IX",
    subgroup: "Manutenção Corretiva",
    piCodes: ["E5MBGRMDEGE", "E5MBPDRDEGE", "E5MBSUNCOMP", "E5MBSUNDIAR", "E5MBSUNOUTR", "E5MBSUNPASS", "E5MMGRMDEGE", "E5MMPDRDEGE", "E5MMSUNCOMP", "E5MMSUNDIAR", "E5MMSUNOUTR", "E5PCFSCMNTV", "FGA121XDEG", "FGA124XMMNT", "OCS70003000", "OCS70003001", "OCS70023001"],
    plannedBaseline: 1691611,
    status: "ATIVA",
  },
  {
    id: "ix-preventiva",
    classKey: "IX",
    classLabel: "Classe IX",
    subgroup: "Manutenção Preventiva",
    piCodes: ["E5MBSUNPREV", "E5MMSUNPREV"],
    plannedLabel: "EXTRA",
    status: "ATIVA",
  },
  {
    id: "diversas-rv",
    classKey: "DIVERSAS",
    classLabel: "Classes Diversas",
    subgroup: "Remonta e Veterinária",
    piCodes: ["E6RVPLJALIC", "E6RVPLJALIE", "E6RVPLJFER3", "E6RVPLJMTOC", "E6RVPLJMTOE", "E6RVPLJOUT4", "E6RVSOLMTOE", "E6RVSOLOUT4"],
    plannedBaseline: 985318.5,
    status: "ATIVA",
  },
  {
    id: "diversas-trnp",
    classKey: "DIVERSAS",
    classLabel: "Classes Diversas",
    subgroup: "Transporte / PDR LOG",
    piCodes: ["E7DATRSAPIO", "E7DATRSDIAR", "E7DATRSPASS"],
    plannedBaseline: 768000,
    status: "ATIVA",
  },
  {
    id: "diversas-extra-pdr-log",
    classKey: "DIVERSAS",
    classLabel: "Classes Diversas",
    subgroup: "EXTRA PDR LOG",
    piCodes: [],
    status: "PENDENTE",
  },
];

export const CANONICAL_CLASS_LABELS: Record<CanonicalClassKey, string> = {
  I: "Classe I",
  II: "Classe II — Material de Intendência",
  III: "Classe III — Óleos e Lubrificantes",
  V: "Classe V",
  VIII: "Classe VIII — Saúde",
  IX: "Classe IX — Manutenção",
  DIVERSAS: "Classes Diversas",
};

export const CANONICAL_RULE_SET: SagRuleSet = {
  source: {
    fileName: CANONICAL_RULE_SOURCE.label,
    importedAt: "2026-08-20T00:00:00.000Z",
    origin: "MANUAL_RULE_MATRIX",
    nature: "REGRA_IMPORTADA",
  },
  groups: CANONICAL_CLASS_GROUPS.map((group, index) => ({
    id: group.id,
    className: group.classKey,
    subgroup: group.subgroup,
    piCodes: group.piCodes,
    status: group.status,
    sourceSheet: "algoritmo",
    sourceRow: 23 + index,
  })),
  briefingRules: [],
  conflicts: [
    { pi: "E6SUPLJA3RR", groupIds: ["i-qr", "i-res-reg"] },
  ],
  warnings: [
    "Mnt Rancho permanece PENDENTE porque a planilha fonte registra PI como ???.",
    "EXTRA PDR LOG permanece PENDENTE porque a planilha fonte não define PI.",
    "PI E6SUPLJA3RR aparece em QR e Reserva Regional; a visualização mostra o vínculo e evita soma duplicada no total da Classe I.",
  ],
};

export function groupsForClass(classKey: CanonicalClassKey) {
  return CANONICAL_CLASS_GROUPS.filter((group) => group.classKey === classKey);
}
