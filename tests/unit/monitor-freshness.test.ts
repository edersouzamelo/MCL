import { describe, expect, it } from "vitest";
import { monitorUpdateAge, monitorFreshness, sagPairFreshness, sagSourceFreshness } from "../../src/modules/grupamento/monitor-freshness";
describe("placar de atualização", () => {
  it("usa o dia local de Cuiabá, inclusive na virada da data UTC", () => {
    const now = new Date("2026-10-02T01:00:00Z");
    expect(monitorUpdateAge("2026-10-01T04:00:00Z", now)).toBe(0);
    expect(monitorUpdateAge("2026-10-01T03:59:59Z", now)).toBe(1);
    expect(monitorUpdateAge("2026-09-24T12:00:00Z", now)).toBe(7);
  });
  it("distingue falta de registro e mantém a escala limitada", () => {
    expect(monitorUpdateAge(null)).toBeNull(); expect(monitorUpdateAge("inválido")).toBeNull();
    expect(monitorFreshness(null).label).toBe("Sem atualização registrada");
    expect(monitorFreshness(0).hue).toBe(120); expect(monitorFreshness(3.5).hue).toBe(60);
    expect(monitorFreshness(7).hue).toBe(0); expect(monitorFreshness(100).hue).toBe(0);
  });
  it("prioriza a referência SAG e usa o dia local sem deslocar datas sem horário", () => {
    const now = new Date("2026-10-01T14:00:00Z");
    expect(sagSourceFreshness({referenceDate:"2026-10-01",importedAt:now.toISOString()},now).age).toBe(0);
    expect(sagSourceFreshness({referenceDate:"2026-09-24",importedAt:now.toISOString()},now)).toMatchObject({age:7,basis:"reference"});
    expect(sagSourceFreshness({referenceDate:"inválida",importedAt:"2026-09-28T14:00:00Z"},now)).toMatchObject({age:3,basis:"import"});
  });
  it("representa a fonte mais antiga e não declara fresca uma carga incompleta", () => {
    const now = new Date("2026-10-01T14:00:00Z"), current = {referenceDate:"2026-10-01",importedAt:now.toISOString()}, rpn = {referenceDate:"2026-09-24",importedAt:now.toISOString()};
    expect(sagPairFreshness(current,rpn,now)).toMatchObject({age:7,complete:true});
    expect(sagPairFreshness(current,null,now)).toMatchObject({age:null,complete:false});
    expect(sagPairFreshness(current,{importedAt:"inválida"},now)).toMatchObject({age:null,complete:true});
  });
});
