import { describe, expect, it } from "vitest";
import { assertCanCaptureEvent } from "@/modules/events/service";

describe("autorizacao por papel", () => {
  it("permite operador logistico", () => {
    expect(() => assertCanCaptureEvent(["WAREHOUSE_OPERATOR"])).not.toThrow();
  });

  it("bloqueia perfil somente leitura", () => {
    expect(() => assertCanCaptureEvent(["READ_ONLY"])).toThrow(/sem permissao/i);
  });
});
