import { describe, it, expect } from "vitest";
import { GET as getCreditosHandler } from "@/app/api/creditos/route";
import { GET as getKpisHandler } from "@/app/api/creditos/kpis/route";
import { GET as getEmpenhosHandler } from "@/app/api/creditos/empenhos/route";
import { NextRequest } from "next/server";

describe("Credit Module - API Route Unit Tests", () => {
  it("GET /api/creditos retorna 200 com lista de créditos", async () => {
    const req = new NextRequest("http://localhost:3000/api/creditos?ano=2026");
    const res = await getCreditosHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("GET /api/creditos/kpis retorna os indicadores do Tesouro Gerencial", async () => {
    const req = new NextRequest("http://localhost:3000/api/creditos/kpis?ano=2026");
    const res = await getKpisHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.summary).toHaveProperty("totalUpdated");
    expect(body.byExpenseNature.length).toBeGreaterThan(0);
    expect(body.monthlyExecution.length).toBeGreaterThan(0);
  });

  it("GET /api/creditos/empenhos retorna as notas de empenho", async () => {
    const req = new NextRequest("http://localhost:3000/api/creditos/empenhos?q=CALCADOS");
    const res = await getEmpenhosHandler(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.count).toBeGreaterThan(0);
    expect(body.data[0]).toHaveProperty("neCode");
  });
});
