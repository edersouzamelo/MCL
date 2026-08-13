import { describe, expect, it } from "vitest";
import { resolveAccessFromState } from "@/modules/auth/access";
import { canManageCatmat } from "@/modules/auth/authorization";
import { getAuthRuntimeConfiguration } from "@/modules/auth/config";
import { createDemoState } from "@/modules/demo/data";

describe("politica de autenticacao S1-1", () => {
  it("mantem o modo demonstrativo desligado sem ativacao e segredos explicitos", () => {
    expect(getAuthRuntimeConfiguration({}).demo.configured).toBe(false);
    expect(
      getAuthRuntimeConfiguration({
        DEMO_AUTH_ENABLED: "true",
        DEMO_USER_PASSWORD: "senha-comprida",
      }).demo.configured,
    ).toBe(false);
  });

  it("ignora configuracao legada e exige ativacao literal", () => {
    expect(
      getAuthRuntimeConfiguration({
        AUTH_SECRET: "segredo-de-sessao",
        DEMO_AUTH_ENABLED: "false",
        DEMO_USER_PASSWORD: "senha-comprida",
      }).demo.configured,
    ).toBe(false);
  });

  it("ativa o demo apenas com segredo, senha e opt-in", () => {
    expect(
      getAuthRuntimeConfiguration({
        AUTH_SECRET: "segredo-de-sessao",
        DEMO_AUTH_ENABLED: "true",
        DEMO_USER_PASSWORD: "senha-comprida",
      }).demo.configured,
    ).toBe(true);
  });

  it("deriva papeis somente dos vinculos locais ativos", () => {
    const access = resolveAccessFromState(createDemoState(), {
      email: "operador.demo@mcl.invalid",
    });

    expect(access?.organizationId).toBe("org-provedor-alfa");
    expect(access?.roles).toEqual(["ADMIN", "LOGISTICS_MANAGER"]);
    expect(access?.roles).not.toContain("WAREHOUSE_OPERATOR");
    expect(access?.roles).not.toContain("AUDITOR");
  });

  it("nega identidade sem vinculo e separa papel de consulta da gestao CATMAT", () => {
    const state = createDemoState();
    expect(resolveAccessFromState(state, { email: "sem-vinculo@mcl.invalid" })).toBeUndefined();
    expect(canManageCatmat(["COMMAND_VIEWER"])).toBe(false);
    expect(canManageCatmat(["LOGISTICS_MANAGER"])).toBe(true);
  });
});
