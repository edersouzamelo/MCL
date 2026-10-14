import { describe, expect, it } from "vitest";
import { compareApprovedDocumentImports, reorderDocumentIds } from "@/modules/grupamento/monitor-content/order";

describe("ordem documental do monitor", () => {
  const at = (time: string) => new Date("2026-10-14T" + time + "Z");

  it("preserva a ordem histórica sem configuração explícita", () => {
    const files = [
      { id: "b", approvedAt: at("12:00:00"), displayOrder: null },
      { id: "a", approvedAt: at("10:00:00"), displayOrder: null },
    ];
    expect(files.sort(compareApprovedDocumentImports).map((file) => file.id)).toEqual(["a", "b"]);
  });

  it("prioriza a ordem manual e acrescenta novas aprovações ao final", () => {
    const files = [
      { id: "new", approvedAt: at("14:00:00"), displayOrder: null },
      { id: "first", approvedAt: at("13:00:00"), displayOrder: 0 },
      { id: "second", approvedAt: at("10:00:00"), displayOrder: 1 },
    ];
    expect(files.sort(compareApprovedDocumentImports).map((file) => file.id))
      .toEqual(["first", "second", "new"]);
  });

  it("reordena sem excluir identificadores ou alterar os demais conteúdos", () => {
    expect(reorderDocumentIds(["a", "b", "c"], "c", "a")).toEqual(["c", "a", "b"]);
    expect(reorderDocumentIds(["a", "b", "c"], "a", "c")).toEqual(["b", "c", "a"]);
    expect(reorderDocumentIds(["a", "b", "c"], "missing", "a")).toEqual(["a", "b", "c"]);
  });
});
