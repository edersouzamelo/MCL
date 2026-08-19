import * as XLSX from "xlsx";

export type SagRuleGroup = {
  id: string;
  className: string;
  subgroup?: string;
  piCodes: string[];
  status: "ATIVA" | "PENDENTE";
  sourceSheet: string;
  sourceRow: number;
};

export type SagRuleConflict = {
  pi: string;
  groupIds: string[];
};

export type SagBriefingRule = {
  id: string;
  slideNumber: number;
  title: string;
  piCodes: string[];
  includeAllEPrefix: boolean;
  sourceSheet: string;
  sourceRow: number;
};

export type SagRuleSet = {
  source: {
    fileName: string;
    importedAt: string;
    origin: "MANUAL_RULE_MATRIX";
    nature: "REGRA_IMPORTADA";
  };
  groups: SagRuleGroup[];
  briefingRules: SagBriefingRule[];
  conflicts: SagRuleConflict[];
  warnings: string[];
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function slug(value: string) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function parsePiCodes(value: unknown) {
  const raw = String(value ?? "")
    .replace(/[\n\r\t]+/g, " ")
    .replace(/[()]/g, " ")
    .trim();
  if (!raw || raw.includes("???")) return [];

  return [...new Set(
    raw
      .split(/[;,\s]+/)
      .map((item) => item.trim().toUpperCase())
      .filter((item) => /^[A-Z0-9]{6,}$/.test(item)),
  )];
}

function findClassPiHeader(matrix: unknown[][]) {
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const normalized = matrix[rowIndex].map(normalizeText);
    const classIndex = normalized.findIndex((cell) => cell === "CLASSES");
    const piIndex = normalized.findIndex((cell) => cell === "PI");
    if (classIndex >= 0 && piIndex > classIndex) return { rowIndex, classIndex, piIndex };
  }
  return null;
}

function parseGroupTable(sheetName: string, matrix: unknown[][], warnings: string[]) {
  const header = findClassPiHeader(matrix);
  if (!header) return [] as SagRuleGroup[];

  const groups: SagRuleGroup[] = [];
  let currentClass = "";
  let blankRun = 0;

  for (let rowIndex = header.rowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex] ?? [];
    const classCell = String(row[header.classIndex] ?? "").trim();
    const subgroupCell = String(row[header.classIndex + 1] ?? "").trim();
    const piCell = String(row[header.piIndex] ?? "").trim();
    const rowText = normalizeText(row.join(" "));

    if (rowText.includes("EXECUCAO ORCAMENTARIA") || /^SLIDE\s+\d+/.test(rowText)) break;

    if (!classCell && !subgroupCell && !piCell) {
      blankRun += 1;
      if (blankRun >= 2) break;
      continue;
    }
    blankRun = 0;

    if (classCell) currentClass = classCell;
    if (!currentClass) continue;

    const piCodes = parsePiCodes(piCell);
    const status: SagRuleGroup["status"] = piCodes.length ? "ATIVA" : "PENDENTE";
    const label = subgroupCell || currentClass;
    const id = `${slug(currentClass)}:${slug(label)}:${rowIndex + 1}`;

    groups.push({
      id,
      className: currentClass,
      subgroup: subgroupCell || undefined,
      piCodes,
      status,
      sourceSheet: sheetName,
      sourceRow: rowIndex + 1,
    });

    if (status === "PENDENTE") {
      warnings.push(`Regra ${currentClass}${subgroupCell ? ` / ${subgroupCell}` : ""}: PI não definido na linha ${rowIndex + 1}.`);
    }
  }

  return groups;
}

function parseBriefingRules(sheetName: string, matrix: unknown[][]) {
  const rules: SagBriefingRule[] = [];
  for (let rowIndex = 0; rowIndex < matrix.length; rowIndex += 1) {
    const text = matrix[rowIndex]
      .map((cell) => String(cell ?? "").trim())
      .filter(Boolean)
      .join(" ");
    const match = text.match(/\bSlide\s+(\d+)\s*-\s*(.+)$/i);
    if (!match) continue;

    const slideNumber = Number(match[1]);
    const title = match[2].trim();
    const parenthetical = [...title.matchAll(/\(([^)]+)\)/g)].map((item) => item[1]).join(" ");
    const piCodes = parsePiCodes(parenthetical);
    const includeAllEPrefix = /TODOS\s+OS\s+E(?:S)?\b/i.test(title);

    rules.push({
      id: `${slug(sheetName)}:slide-${slideNumber}:${rowIndex + 1}`,
      slideNumber,
      title,
      piCodes,
      includeAllEPrefix,
      sourceSheet: sheetName,
      sourceRow: rowIndex + 1,
    });
  }
  return rules;
}

function findConflicts(groups: SagRuleGroup[]) {
  const piToGroups = new Map<string, string[]>();
  for (const group of groups) {
    for (const pi of group.piCodes) {
      const current = piToGroups.get(pi) ?? [];
      current.push(group.id);
      piToGroups.set(pi, current);
    }
  }

  return [...piToGroups.entries()]
    .filter(([, groupIds]) => new Set(groupIds).size > 1)
    .map(([pi, groupIds]) => ({ pi, groupIds: [...new Set(groupIds)] }))
    .sort((a, b) => a.pi.localeCompare(b.pi));
}

export function parseSagRuleWorkbook(buffer: ArrayBuffer, fileName: string): SagRuleSet {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const warnings: string[] = [];
  const groups: SagRuleGroup[] = [];
  const briefingRules: SagBriefingRule[] = [];

  for (const sheetName of workbook.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: "",
      raw: false,
    });
    groups.push(...parseGroupTable(sheetName, matrix, warnings));
    briefingRules.push(...parseBriefingRules(sheetName, matrix));
  }

  const conflicts = findConflicts(groups);
  if (!groups.length) warnings.push("Nenhuma tabela Classes/PI foi reconhecida no arquivo de regras.");
  for (const conflict of conflicts) {
    warnings.push(`PI ${conflict.pi} aparece em mais de um grupo. O MCL não o soma duas vezes no total de Classe sem tratamento explícito.`);
  }

  return {
    source: {
      fileName,
      importedAt: new Date().toISOString(),
      origin: "MANUAL_RULE_MATRIX",
      nature: "REGRA_IMPORTADA",
    },
    groups,
    briefingRules,
    conflicts,
    warnings,
  };
}
