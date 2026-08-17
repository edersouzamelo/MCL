import { describe, it, expect } from "vitest";
import { parseSiafiBuffer, processSiafiIngestion } from "@/modules/connectors/siafi/parser";

describe("SIAFI / Tesouro Gerencial Auto-Ingestion Connector", () => {
  it("deve interpretar corretamente linhas do relatório Mestre do TG em CSV", () => {
    const csvContent = `UG Executora\tPI\tNE CCor\tNE CCor - Ano Emissão\tNE CCor - Favorecido\tNatureza Despesa Detalhada\tMovim. Líquido - R$ (Item Informação)
160136\tPI-REQ-COT-2026\t2026NE000142\t2026\tCALCADOS ALFA LTDA\t33903001\t180.000,00
160142\tPI-RPNP-2025\t2025NE000840\t2025\tCONFECCOES BRAVO LTDA\t33903004\t90.000,00`;

    const buffer = Buffer.from(csvContent, "utf-8");
    const records = parseSiafiBuffer(buffer, "MCL_MESTRE_EXERCICIO_2026.csv");

    expect(records.length).toBe(2);
    expect(records[0].ugCode).toBe("160136");
    expect(records[0].neCode).toBe("2026NE000142");
    expect(records[0].isRPNP).toBe(false);
    expect(records[0].amount).toBe(180000);

    expect(records[1].ugCode).toBe("160142");
    expect(records[1].isRPNP).toBe(true);
    expect(records[1].amount).toBe(90000);
  });

  it("deve processar o resultado da ingestão separando Exercício de RPNP", () => {
    const records = [
      {
        ugCode: "160136",
        planningCode: "PI-2026",
        neCode: "2026NE0001",
        neYearIssued: 2026,
        supplierName: "FORNECEDOR A",
        expenseNature: "339030",
        amount: 10000,
        isRPNP: false,
      },
      {
        ugCode: "160142",
        planningCode: "PI-2025",
        neCode: "2025NE0002",
        neYearIssued: 2025,
        supplierName: "FORNECEDOR B",
        expenseNature: "339030",
        amount: 5000,
        isRPNP: true,
      },
    ];

    const result = processSiafiIngestion(records, "MCL_MESTRE_EXERCICIO_2026.xlsx");

    expect(result.success).toBe(true);
    expect(result.totalRecordsProcessed).toBe(2);
    expect(result.commitmentsUpdatedCount).toBe(1);
    expect(result.rpnpsUpdatedCount).toBe(1);
  });
});
