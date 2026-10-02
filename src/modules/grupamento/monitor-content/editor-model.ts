import type { MonitorSlideElement } from "./types";

export type EditorContent = { title: string; elements: MonitorSlideElement[] };
/** Field patches preserve unrelated compiler improvements and make undo transactional. */
export type EditorPatch = {
  id: string;
  field: string;
  before?: unknown;
  after?: unknown;
};
export type EditorIssue = {
  id: string;
  message: string;
  severity: "warning" | "error";
};
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const record = (element: MonitorSlideElement) =>
  element as unknown as Record<string, unknown>;
export function diffContent(
  before: EditorContent,
  after: EditorContent,
): EditorPatch[] {
  const patches: EditorPatch[] = [];
  if (before.title !== after.title)
    patches.push({
      id: "$scene",
      field: "title",
      before: before.title,
      after: after.title,
    });
  const old = new Map(before.elements.map((e) => [e.elementId!, e]));
  const next = new Map(after.elements.map((e) => [e.elementId!, e]));
  for (const [id, e] of old)
    if (!next.has(id)) patches.push({ id, field: "$element", before: e });
  for (const [id, e] of next) {
    const previous = old.get(id);
    if (!previous) {
      patches.push({ id, field: "$element", after: e });
      continue;
    }
    for (const field of new Set([
      ...Object.keys(previous),
      ...Object.keys(e),
    ])) {
      if (field === "elementId") continue;
      if (!equal(record(previous)[field], record(e)[field]))
        patches.push({
          id,
          field,
          before: record(previous)[field],
          after: record(e)[field],
        });
    }
  }
  return structuredClone(patches);
}
export function applyPatches(
  base: EditorContent,
  patches: EditorPatch[],
  reverse = false,
): EditorContent {
  const result = { title: base.title, elements: [...base.elements] };
  for (const patch of reverse ? [...patches].reverse() : patches) {
    const value = reverse ? patch.before : patch.after;
    if (patch.id === "$scene") {
      result.title = value as string;
      continue;
    }
    const index = result.elements.findIndex((e) => e.elementId === patch.id);
    if (patch.field === "$element") {
      if (value === undefined) {
        if (index >= 0) result.elements.splice(index, 1);
      } else if (index < 0)
        result.elements.push(structuredClone(value) as MonitorSlideElement);
      else
        result.elements[index] = structuredClone(value) as MonitorSlideElement;
    } else if (index >= 0) {
      const element = { ...result.elements[index] };
      if (value === undefined) delete record(element)[patch.field];
      else record(element)[patch.field] = structuredClone(value);
      result.elements[index] = element;
    }
  }
  return result;
}
/** Three-way merge. A missing/changed target is a conflict, never a silently lost edit. */
export function rebasePatches(next: EditorContent, patches: EditorPatch[]) {
  const conflicts: EditorIssue[] = [];
  for (const patch of patches) {
    const element = next.elements.find((e) => e.elementId === patch.id);
    const current =
      patch.id === "$scene"
        ? next.title
        : patch.field === "$element"
          ? element
          : element && record(element)[patch.field];
    if (
      (patch.field !== "$element" && patch.id !== "$scene" && !element) ||
      (!equal(current, patch.before) && !equal(current, patch.after))
    ) {
      conflicts.push({
        id: patch.id,
        severity: "error",
        message: `O objeto ou campo ${patch.field} mudou na nova versão. Revise antes de publicar.`,
      });
    }
  }
  return {
    conflicts,
    content: conflicts.length ? null : applyPatches(next, patches),
  };
}
export function editorPreflight(content: EditorContent): EditorIssue[] {
  const issues: EditorIssue[] = [];
  const ids = new Set<string>();
  for (const e of content.elements) {
    const id = e.elementId ?? "";
    if (!id || ids.has(id))
      issues.push({
        id,
        message: "Identificador ausente ou duplicado.",
        severity: "error",
      });
    ids.add(id);
    if (![e.x, e.y, e.w, e.h].every(Number.isFinite) || e.w <= 0 || e.h <= 0)
      issues.push({ id, message: "Dimensões inválidas.", severity: "error" });
    if (e.x < 0 || e.y < 0 || e.x + e.w > 1.000001 || e.y + e.h > 1.000001)
      issues.push({
        id,
        message: "Objeto fora da área de apresentação.",
        severity: "warning",
      });
    if (e.kind === "image" && !e.assetId)
      issues.push({ id, message: "Imagem ausente.", severity: "error" });
    if (e.kind === "text" && (e.fontSizePt ?? 18) < 14)
      issues.push({
        id,
        message: "Texto pequeno para leitura no monitor.",
        severity: "warning",
      });
  }
  const text = content.elements.filter((e) => e.kind === "text");
  for (let i = 0; i < text.length; i++)
    for (let j = i + 1; j < text.length; j++) {
      const a = text[i],
        b = text[j];
      const area =
        Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
      if (area > Math.min(a.w * a.h, b.w * b.h) * 0.4)
        issues.push({
          id: a.elementId!,
          message:
            "Textos sobrepostos. Confira se a sobreposição é intencional.",
          severity: "warning",
        });
    }
  for (const e of content.elements)
    if (e.attachedTo && !ids.has(e.attachedTo))
      issues.push({
        id: e.elementId!,
        message: "Anotação sem objeto de referência.",
        severity: "error",
      });
  return issues;
}
export function selectionBounds(elements: MonitorSlideElement[]) {
  const x = Math.min(...elements.map((e) => e.x)),
    y = Math.min(...elements.map((e) => e.y));
  return {
    x,
    y,
    w: Math.max(...elements.map((e) => e.x + e.w)) - x,
    h: Math.max(...elements.map((e) => e.y + e.h)) - y,
  };
}
export const RESIZE_HANDLES = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
] as const;
export type ResizeHandle = (typeof RESIZE_HANDLES)[number];
export function resizeSelection(
  elements: MonitorSlideElement[],
  handle: ResizeHandle,
  dx: number,
  dy: number,
  proportional: boolean,
) {
  const b = selectionBounds(elements);
  let w = Math.max(
    0.005,
    b.w + (handle.includes("e") ? dx : handle.includes("w") ? -dx : 0),
  );
  let h = Math.max(
    0.005,
    b.h + (handle.includes("s") ? dy : handle.includes("n") ? -dy : 0),
  );
  if (proportional) {
    const scale =
      Math.abs(w / b.w - 1) >= Math.abs(h / b.h - 1) ? w / b.w : h / b.h;
    w = b.w * scale;
    h = b.h * scale;
  }
  const x = handle.includes("w") ? b.x + b.w - w : b.x,
    y = handle.includes("n") ? b.y + b.h - h : b.y;
  return elements.map((e) => ({
    ...e,
    x: x + ((e.x - b.x) * w) / b.w,
    y: y + ((e.y - b.y) * h) / b.h,
    w: (e.w * w) / b.w,
    h: (e.h * h) / b.h,
  }));
}
export function snapSelection(
  moving: MonitorSlideElement[],
  others: MonitorSlideElement[],
  tolerance: number,
) {
  const b = selectionBounds(moving),
    guides: { axis: "x" | "y"; value: number }[] = [];
  let dx = 0,
    dy = 0;
  for (const axis of ["x", "y"] as const) {
    const dimension = axis === "x" ? "w" : "h";
    const targets = [
      0,
      0.02,
      0.5,
      0.98,
      1,
      ...others.flatMap((e) => [
        e[axis],
        e[axis] + e[dimension] / 2,
        e[axis] + e[dimension],
      ]),
    ];
    let best = tolerance,
      delta = 0,
      line: number | null = null;
    for (const anchor of [
      b[axis],
      b[axis] + b[dimension] / 2,
      b[axis] + b[dimension],
    ])
      for (const target of targets) {
        if (Math.abs(target - anchor) < best) {
          best = Math.abs(target - anchor);
          delta = target - anchor;
          line = target;
        }
      }
    if (line !== null) {
      guides.push({ axis, value: line });
      if (axis === "x") dx = delta;
      else dy = delta;
    }
  }
  return {
    elements: moving.map((e) => ({ ...e, x: e.x + dx, y: e.y + dy })),
    guides,
  };
}

/** Compatible recompilation can change IDs once when migrating legacy scenes.
 * Match only unique semantic signatures; ambiguous matches remain conflicts. */
export function rebaseCompiledContent(
  oldBase: EditorContent,
  nextBase: EditorContent,
  overrides: EditorPatch[],
) {
  const signature = (e: MonitorSlideElement) =>
    JSON.stringify([
      e.kind,
      e.kind === "text"
        ? e.text
        : e.kind === "chart"
          ? e.chart
          : e.kind === "table"
            ? [e.columns, e.rows]
            : e.kind === "image"
              ? (e.assetKey ?? null)
              : [e.fill, e.lineColor, e.radius],
    ]);
  const mapped = {
    ...nextBase,
    elements: nextBase.elements.map((e) => ({ ...e })),
  };
  const used = new Set<string>();
  const redirects = new Map<string, string>();
  for (const old of oldBase.elements) {
    if (mapped.elements.some((e) => e.elementId === old.elementId)) continue;
    const matching = mapped.elements.filter(
      (e) => !used.has(e.elementId!) && signature(e) === signature(old),
    );
    if (
      matching.length === 1 &&
      oldBase.elements.filter((e) => signature(e) === signature(old)).length ===
        1
    ) {
      used.add(matching[0].elementId!);
      redirects.set(matching[0].elementId!, old.elementId!);
      matching[0].elementId = old.elementId;
    }
  }
  for (const element of mapped.elements) if (element.attachedTo && redirects.has(element.attachedTo)) element.attachedTo = redirects.get(element.attachedTo);
  return { base: mapped, ...rebasePatches(mapped, overrides) };
}

export const EDITOR_LAYOUTS = [
  "Duas colunas",
  "Quatro painéis",
  "Gráfico e notas",
  "Imagem e texto",
  "Conteúdo central",
] as const;
/** Proposals never alter source or contents; caller must preview and explicitly apply. */
export function proposeEditorLayout(
  elements: MonitorSlideElement[],
  name: (typeof EDITOR_LAYOUTS)[number],
) {
  const selected = elements.filter((e) => !e.locked && e.kind !== "shape");
  if (!selected.length) return structuredClone(elements);
  const groups = new Map<string, MonitorSlideElement[]>();
  for (const e of selected) {
    const key = e.groupId ?? e.attachedTo ?? e.elementId!;
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  // An annotation and its target share a single affine transform.
  const units = [...groups.values()];
  const layout = units
    .map((unit, index) => {
      let target = { x: 0.03, y: 0.03, w: 0.94, h: 0.94 };
      if (name === "Gráfico e notas" || name === "Imagem e texto") {
        if (index === 0) target = { x: 0.03, y: 0.03, w: 0.62, h: 0.94 };
        else
          target = {
            x: 0.69,
            y: 0.03 + ((index - 1) * 0.94) / Math.max(1, units.length - 1),
            w: 0.28,
            h: 0.9 / Math.max(1, units.length - 1),
          };
      } else {
        const cols = name === "Conteúdo central" ? 1 : 2,
          rows = Math.ceil(units.length / cols);
        target = {
          x: 0.03 + ((index % cols) * 0.96) / cols,
          y: 0.03 + (Math.floor(index / cols) * 0.96) / rows,
          w: 0.94 / cols - 0.01,
          h: 0.94 / rows - 0.01,
        };
      }
      const b = selectionBounds(unit),
        scale = Math.min(target.w / b.w, target.h / b.h);
      return unit.map((e) => ({
        ...e,
        x: target.x + (e.x - b.x) * scale,
        y: target.y + (e.y - b.y) * scale,
        w: e.w * scale,
        h: e.h * scale,
      }));
    })
    .flat();
  return elements.map(
    (e) => layout.find((v) => v.elementId === e.elementId) ?? e,
  );
}
