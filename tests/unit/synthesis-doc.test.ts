import { describe, expect, it } from "vitest";
import { generateAdhesionDocument } from "@/modules/coverage/synthesis-doc";
import type { AcquisitionInstrument, ItemCatalogMapping } from "@/modules/domain/types";

describe("Gerador de Minuta de Adesão (Gate G7)", () => {
  const mapping: ItemCatalogMapping = {
    id: "map-1",
    mclItemId: "item-1",
    needId: "need-1",
    externalCatalog: "CATMAT",
    externalItemCode: "605160",
    externalDescription: "COTURNO OPERACIONAL MILITAR",
    mappingVersion: 1,
    confidence: 1.0,
    status: "ACTIVE",
    confirmedAt: new Date().toISOString(),
    confirmedBy: "actor-1",
    justification: "Item padronizado de Classe II",
  };

  const instrument: AcquisitionInstrument = {
    id: "inst-123",
    persistentCode: "inst-123",
    type: "ARP",
    reference: "Ata nº 00001/2024",
    supplierNameSynthetic: "FORNECEDOR MILITAR LTDA",
    sourceSystem: "COMPRAS_GOV",
    sourceRecordId: "rec-123",
    organizationCode: "160136",
    itemCode: "605160",
    externalReference: "00001/2024",
    quantity: 200,
    unitValue: 250.00,
    totalValue: 50000.00,
    capacity: 100,
    validFrom: "2026-01-01T00:00:00.000Z",
    validUntil: "2026-12-31T00:00:00.000Z",
    status: "VIGENTE",
  };

  it("gera minuta de adesão formatada contendo artigos da Lei 14.133/2021", () => {
    const doc = generateAdhesionDocument({
      needId: "need-1",
      persistentCode: "MCL-NEC-2026-0001",
      itemName: "Coturno operacional",
      variantLabel: "Tamanho 42",
      quantityRequested: 200,
      deficit: 80,
      organizationName: "Comando do 9º Groupamento Logístico",
      organizationUasg: "160136",
      mapping,
      instrument,
      justification: "Atendimento emergencial de Classe II",
    });

    expect(doc).toContain("MINUTA DE SOLICITAÇÃO DE ADESÃO À ATA DE REGISTRO DE PREÇOS (CARONA)");
    expect(doc).toContain("Lei nº 14.133, de 1º de abril de 2021, Art. 86");
    expect(doc).toContain("605160");
    expect(doc).toContain("00001/2024");
    expect(doc).toContain("Déficit Apurado): 80 un");
    expect(doc).toContain("R$ 250.00");
    expect(doc).toContain("R$ 20000.00"); // 80 * 250
  });
});
