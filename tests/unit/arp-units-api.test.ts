import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/coverage/atas/units/route";
import { getServerSession } from "next-auth";
import { getDemoState, resetDemoState } from "@/server/demo-store";
import { clearComprasGovCache } from "@/modules/connectors/compras-gov/http";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  prisma: {
    acquisitionInstrument: {
      findUnique: vi.fn().mockResolvedValue({ id: "inst-arp-001" }),
    },
    arpUnitRecord: {
      upsert: vi.fn().mockResolvedValue({}),
    },
    externalRecord: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  },
}));

function session() {
  vi.mocked(getServerSession).mockResolvedValue({
    user: {
      id: "user-demo-admin",
      organizationId: "org-provedor-alfa",
      roles: ["LOGISTICS_MANAGER"],
    },
  });
  const state = getDemoState();
  state.acquisitionInstruments.unshift({
    id: "inst-arp-001",
    instrumentType: "ARP",
    instrumentNumber: "00015/2026",
    title: "Ata de teste",
    status: "ACTIVE",
    issueDate: "2026-03-25",
    expirationDate: "2027-03-25",
    supplierName: "FORNECEDOR TESTE",
  } as any);
}

function responseJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function payload(overrides: Record<string, unknown> = {}) {
  return {
    needId: "need-calca-120",
    acquisitionInstrumentId: "inst-arp-001",
    numeroAta: "00015/2026",
    unidadeGerenciadora: "201057",
    numeroItem: "00020",
    ...overrides,
  };
}

function request(body: Record<string, unknown>) {
  return new Request("http://localhost/api/coverage/atas/units", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("API Route - /api/coverage/atas/units", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetDemoState();
    clearComprasGovCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("retorna 401 caso o usuario nao esteja autenticado", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const response = await POST(request(payload()));

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Autenticacao obrigatoria.");
  });

  it("retorna lista de unidades reais vindas do Compras.gov.br", async () => {
    session();
    vi.mocked(fetch).mockResolvedValue(
      responseJson({
        resultado: [
          {
            numeroAta: "00015/2026",
            unidadeGerenciadora: "201057",
            numeroItem: "00020",
            codigoUnidade: "160011",
            nomeUnidade: "PARQUE DE MATERIAL AERONÁUTICO",
            tipoUnidade: "PARTICIPANTE",
            quantidadeRegistrada: 50,
            saldoAdesoes: 100,
            aceitaAdesao: true,
          },
        ],
        totalRegistros: 1,
      }),
    );

    const response = await POST(request(payload()));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.records).toHaveLength(1);
    expect(body.records[0].codigoUnidade).toBe("160011");
    expect(body.records[0].nomeUnidade).toBe("PARQUE DE MATERIAL AERONÁUTICO");
    expect(body.records[0].aceitaAdesao).toBe(true);
  });

  it("nao fabrica unidades quando a consulta retorna resultado vazio", async () => {
    session();
    vi.mocked(fetch).mockResolvedValue(
      responseJson({ resultado: [], totalRegistros: 0 }),
    );

    const response = await POST(request(payload()));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.records).toHaveLength(0);
  });
});
