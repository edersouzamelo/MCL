import { describe, it, expect } from "vitest";
import {
  applyPatches,
  diffContent,
  rebasePatches,
  rebaseCompiledContent,
  resizeSelection,
  snapSelection,
  editorPreflight,
  type EditorContent,
} from "../../src/modules/grupamento/monitor-content/editor-model";
import { prepareEditorScene } from "../../src/modules/grupamento/monitor-content/online-editor";
import { compileSlide } from "../../src/modules/grupamento/monitor-content/compiler/scene-graph";
import type {
  MonitorDocumentSceneDto,
  MonitorSlideElement,
} from "../../src/modules/grupamento/monitor-content/types";
const a: MonitorSlideElement = {
  kind: "text",
  elementId: "a",
  text: "Fonte original",
  x: 0.1234567,
  y: 0.2,
  w: 0.4,
  h: 0.2,
  z: 1,
};
const b: MonitorSlideElement = {
  ...a,
  elementId: "b",
  text: "Anotação",
  x: 0.2,
  z: 2,
};
const base: EditorContent = { title: "Rio de Janeiro", elements: [a, b] };
describe("transactional editor", () => {
  it("preserves deliberate overlap and exact coordinates through patches and reopening", () => {
    const edited = {
      ...base,
      elements: [
        { ...a, x: 0.222222222 },
        { ...b, x: 0.222222222, y: 0.2 },
      ],
    };
    const patches = diffContent(base, edited),
      effective = applyPatches(base, patches);
    expect(effective).toEqual(edited);
    expect(applyPatches(effective, patches, true)).toEqual(base);
    const scene = {
      id: "scene",
      title: effective.title,
      payload: {
        onlineEditor: { version: 1, revision: 1 },
        layout: {
          version: 2,
          width: 1600,
          height: 900,
          elements: effective.elements,
        },
      },
    } as MonitorDocumentSceneDto;
    expect(prepareEditorScene(scene).payload.layout?.elements).toEqual(
      edited.elements,
    );
  });
  it("rebases a moved object onto a base with improved text, preserving both", () => {
    const edited = { ...base, elements: [{ ...a, x: 0.6 }, b] },
      patches = diffContent(base, edited);
    const next = { ...base, elements: [{ ...a, text: "Fonte corrigida" }, b] };
    expect(rebasePatches(next, patches).content?.elements[0]).toMatchObject({
      text: "Fonte corrigida",
      x: 0.6,
    });
  });
  it("blocks removed or concurrently edited fields, but accepts an already applied change", () => {
    const patches = diffContent(base, {
      ...base,
      elements: [{ ...a, x: 0.6 }, b],
    });
    expect(
      rebasePatches({ ...base, elements: [b] }, patches).conflicts,
    ).toHaveLength(1);
    expect(
      rebasePatches({ ...base, elements: [{ ...a, x: 0.3 }, b] }, patches)
        .content,
    ).toBeNull();
    expect(
      rebasePatches({ ...base, elements: [{ ...a, x: 0.6 }, b] }, patches)
        .conflicts,
    ).toEqual([]);
  });
  it("can remap uniquely identified legacy objects, never guesses among duplicates", () => {
    const patches = diffContent(base, {
      ...base,
      elements: [{ ...a, x: 0.6 }, b],
    });
    const next = { ...base, elements: [{ ...a, elementId: "native-a" }, b] };
    expect(
      rebaseCompiledContent(base, next, patches).content?.elements[0].x,
    ).toBe(0.6);
    expect(
      rebaseCompiledContent(
        base,
        { ...next, elements: [...next.elements, { ...a, elementId: "other" }] },
        patches,
      ).content,
    ).toBeNull();
  });
  it("roundtrips add/delete and styles with one undo transaction", () => {
    const next = { title: "Alterado", elements: [{ ...b, bold: true }] };
    const patches = diffContent(base, next);
    expect(applyPatches(base, patches)).toEqual(next);
    expect(
      applyPatches(next, patches, true).elements.sort((a, b) => a.z - b.z),
    ).toEqual(base.elements);
  });
  it("resizes from north-west, keeping opposite corner and image proportions", () => {
    const image: MonitorSlideElement = {
      kind: "image",
      elementId: "image",
      assetId: "image",
      x: 0.2,
      y: 0.2,
      w: 0.4,
      h: 0.2,
      z: 1,
    };
    const result = resizeSelection([image], "nw", -0.1, -0.1, true)[0];
    expect(result.w / result.h).toBeCloseTo(2);
    expect(result.x + result.w).toBeCloseTo(0.6);
    expect(result.y + result.h).toBeCloseTo(0.4);
  });
  it("snap is viewport-tolerant and does not alter dimensions", () => {
    const result = snapSelection([{ ...a, x: 0.501 }], [], 0.006);
    expect(result.elements[0].x).toBe(0.5);
    expect(result.elements[0].w).toBe(a.w);
    expect(result.guides).toContainEqual({ axis: "x", value: 0.5 });
  });
  it("preflight permits intentional overlap but catches missing assets/relations", () => {
    expect(
      editorPreflight(base).every((issue) => issue.severity === "warning"),
    ).toBe(true);
    expect(editorPreflight(base)[0].message).toContain("intencional");
    expect(
      editorPreflight({
        ...base,
        elements: [{ ...a, attachedTo: "missing" }],
      }).some((i) => i.severity === "error"),
    ).toBe(true);
  });
  it("native object IDs survive source reordering", () => {
    const compile = (elements: MonitorSlideElement[], nativeId: string[]) =>
      compileSlide({
        elements,
        title: "Título",
        page: 1,
        rawHash: "source",
        structuralHash: "shape",
        native: nativeId.map((nativeId) => ({ nativeId })),
      });
    const first = compile([a, b], ["10", "20"]),
      second = compile([b, a], ["20", "10"]);
    expect(first.parsedInput.nodes[0].id).toBe(second.parsedInput.nodes[1].id);
  });
});
