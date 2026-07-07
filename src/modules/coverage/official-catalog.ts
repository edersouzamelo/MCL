import { hashPayload } from "@/modules/connectors/compras-gov/normalizers";
import { getComprasGovConfig } from "@/modules/connectors/compras-gov/config";
import { createComprasGovClient } from "@/modules/connectors/compras-gov/http";
import { COMPRAS_GOV_CATMAT_ENDPOINT } from "@/modules/connectors/compras-gov/constants";
import { comprasGovApiResponseSchema } from "@/modules/connectors/compras-gov/schemas";

export interface OfficialCatalogItem {
  catalogType: "CATMAT" | "CATSER";
  externalCode: string;
  description: string;
  sourceSystem: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  payloadHash: string;
  payload: Record<string, any>;
  status: "LIVE_OK" | "LIVE_FAILED" | "CACHE_HIT" | "EMPTY" | "STALE" | "UNSUPPORTED";
  error?: string;
}

export function mapCatalogItemToOfficial(
  item: any,
  url: string,
  fetchedAt: string,
  status: OfficialCatalogItem["status"] = "LIVE_OK"
): OfficialCatalogItem {
  return {
    catalogType: "CATMAT",
    externalCode: String(item.codigoItem),
    description: item.descricaoItem,
    sourceSystem: "COMPRAS_GOV",
    sourceUrl: url,
    fetchedAt,
    sourceUpdatedAt: item.dataHoraAtualizacao || item.dataHoraInclusao || undefined,
    payloadHash: hashPayload(item),
    payload: item,
    status,
  };
}

export async function searchOfficialCatalog(
  query: string,
  catalogType: "CATMAT" | "CATSER" | "AMBOS",
  fetchImpl?: typeof fetch
): Promise<OfficialCatalogItem[]> {
  const fetchedAt = new Date().toISOString();
  const results: OfficialCatalogItem[] = [];

  const getCATSERUnsupported = (): OfficialCatalogItem => {
    return {
      catalogType: "CATSER",
      externalCode: "UNSUPPORTED",
      description: "CATSER previsto na arquitetura, mas endpoint oficial ainda não confirmado nesta implementação.",
      sourceSystem: "MCL_SYSTEM",
      sourceUrl: "local://unsupported",
      fetchedAt,
      payloadHash: "unsupported-hash",
      payload: {},
      status: "UNSUPPORTED",
      error: "when supported by the current integration"
    };
  };

  const searchCATMAT = async (): Promise<OfficialCatalogItem[]> => {
    try {
      const config = getComprasGovConfig();
      const client = createComprasGovClient(config, fetchImpl);

      const params: Record<string, string | number | boolean | undefined> = {
        pagina: 1,
        statusItem: true,
      };

      if (/^\d+$/.test(query.trim())) {
        params.codigoItem = Number(query.trim());
      } else {
        params.descricaoItem = query.trim();
      }

      const { data, url } = await client.getJson(
        COMPRAS_GOV_CATMAT_ENDPOINT,
        params,
        comprasGovApiResponseSchema
      );

      return (data.resultado || []).map((raw: any) =>
        mapCatalogItemToOfficial(raw, url, fetchedAt, "LIVE_OK")
      );
    } catch (error: any) {
      throw new Error(`Erro ao consultar API oficial Compras.gov.br para CATMAT (when supported by the current integration): ${error.message}`);
    }
  };

  if (catalogType === "CATSER") {
    results.push(getCATSERUnsupported());
    return results;
  }

  if (catalogType === "CATMAT") {
    return await searchCATMAT();
  }

  if (catalogType === "AMBOS") {
    // Envelope for CATSER
    results.push(getCATSERUnsupported());
    try {
      const catmatResults = await searchCATMAT();
      results.push(...catmatResults);
    } catch (err: any) {
      // In AMBOS mode, do not break the entire search if CATMAT fails
      results.push({
        catalogType: "CATMAT",
        externalCode: "FAILED",
        description: `Falha na consulta CATMAT: ${err.message}`,
        sourceSystem: "COMPRAS_GOV",
        sourceUrl: COMPRAS_GOV_CATMAT_ENDPOINT,
        fetchedAt,
        payloadHash: "failed-hash",
        payload: {},
        status: "LIVE_FAILED",
        error: `Consulta Compras.gov.br falhou (when supported by the current integration): ${err.message}`
      });
    }
    return results;
  }

  return results;
}

export async function validateOfficialCode(
  catalogType: "CATMAT" | "CATSER",
  externalCode: string,
  fetchImpl?: typeof fetch
): Promise<OfficialCatalogItem> {
  const fetchedAt = new Date().toISOString();

  if (catalogType === "CATSER") {
    return {
      catalogType: "CATSER",
      externalCode: "UNSUPPORTED",
      description: "CATSER previsto na arquitetura, mas endpoint oficial ainda não confirmado nesta implementação.",
      sourceSystem: "MCL_SYSTEM",
      sourceUrl: "local://unsupported",
      fetchedAt,
      payloadHash: "unsupported-hash",
      payload: {},
      status: "UNSUPPORTED",
      error: "when supported by the current integration"
    };
  }

  if (!/^\d+$/.test(externalCode.trim())) {
    throw new Error("Código de validação inválido. Deve ser numérico para CATMAT.");
  }

  try {
    const config = getComprasGovConfig();
    const client = createComprasGovClient(config, fetchImpl);
    const params = { codigoItem: Number(externalCode.trim()) };

    const { data, url } = await client.getJson(
      COMPRAS_GOV_CATMAT_ENDPOINT,
      params,
      comprasGovApiResponseSchema
    );

    const matchingItem = (data.resultado || []).find(
      (item: any) => String(item.codigoItem) === externalCode.trim()
    );

    if (!matchingItem) {
      throw new Error(`Item CATMAT com código ${externalCode} não encontrado na base oficial.`);
    }

    return mapCatalogItemToOfficial(matchingItem, url, fetchedAt, "LIVE_OK");
  } catch (error: any) {
    throw new Error(`Erro ao validar código no Compras.gov.br (when supported by the current integration): ${error.message}`);
  }
}
