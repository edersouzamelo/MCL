import { describe, expect, it } from "vitest";
import { calculateArpMulticriteriaScore } from "@/modules/coverage/multicriteria";
import type { AcquisitionInstrument, ArpUnitRecord } from "@/modules/domain/types";

describe("Motor Determinístico de Pontuação Multicritério (Score MCL)", () => {
  const futureDate = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000).toISOString(); // +300 dias

  const baseInstrument: AcquisitionInstrument = {
    id: "inst-123",
    persistentCode: "inst-123",
    type: "ARP",
    reference: "Ata nº 00001/2024",
    supplierNameSynthetic: "FORNECEDOR TESTE",
    sourceSystem: "COMPRAS_GOV",
    sourceRecordId: "rec-123",
    organizationCode: "160160",
    itemCode: "605160",
    externalReference: "00001/2024",
    quantity: 100,
    unitValue: 100.00,
    totalValue: 10000.00,
    capacity: 100,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: futureDate,
    status: "VIGENTE",
  };

  it("atribui pontuação máxima (100 pts) para ata própria, menor preço, saldo integral e vigência ampla", () => {
    const instrument = { ...baseInstrument, organizationCode: "160136" }; // Ata Própria
    const unitRecords: ArpUnitRecord[] = [
      {
        id: "unit-1",
        needId: "need-1",
        acquisitionInstrumentId: "inst-123",
        numeroAta: "00001/2024",
        unidadeGerenciadora: "160136",
        numeroItem: "1",
        codigoUnidade: "160136",
        quantidadeRegistrada: 200,
        saldoAdesoes: 100,
        saldoRemanejamentoEmpenho: 0,
        aceitaAdesao: true,
        sourceUrl: "https://compras.gov.br",
        fetchedAt: new Date().toISOString(),
        payload: {},
      },
    ];

    const result = calculateArpMulticriteriaScore(instrument, 80, unitRecords, 100.00, "160136");

    expect(result.totalScore).toBe(100);
    expect(result.tier).toBe("ALTAMENTE_RECOMENDADA");
    expect(result.factors.price.score).toBe(35);
    expect(result.factors.balance.score).toBe(30);
    expect(result.factors.validity.score).toBe(20);
    expect(result.factors.priority.score).toBe(15);
  });

  it("penaliza score a 0 no fator saldo quando a UG veda adesão externa (aceitaAdesao = false)", () => {
    const unitRecords: ArpUnitRecord[] = [
      {
        id: "unit-1",
        needId: "need-1",
        acquisitionInstrumentId: "inst-123",
        numeroAta: "00001/2024",
        unidadeGerenciadora: "930800",
        numeroItem: "1",
        codigoUnidade: "930800",
        quantidadeRegistrada: 200,
        saldoAdesoes: 0,
        saldoRemanejamentoEmpenho: 0,
        aceitaAdesao: false,
        sourceUrl: "https://compras.gov.br",
        fetchedAt: new Date().toISOString(),
        payload: {},
      },
    ];

    const result = calculateArpMulticriteriaScore(baseInstrument, 80, unitRecords, 100.00, "160136");

    expect(result.factors.balance.score).toBe(0);
    expect(result.factors.balance.explanation).toContain("VEDAÇÃO LEGAL");
  });
});
