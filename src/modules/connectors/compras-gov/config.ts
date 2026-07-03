import { z } from "zod";
import { DEFAULT_COMPRAS_GOV_API_BASE_URL } from "./constants";

const booleanFromEnv = z
  .string()
  .optional()
  .transform((value) => value !== "false");

const intFromEnv = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).optional().default(fallback);

const envSchema = z.object({
  COMPRAS_GOV_API_BASE_URL: z.string().url().optional().default(DEFAULT_COMPRAS_GOV_API_BASE_URL),
  COMPRAS_GOV_SYNC_ENABLED: booleanFromEnv,
  COMPRAS_GOV_PAGE_SIZE: intFromEnv(10, 1, 50),
  COMPRAS_GOV_REQUEST_TIMEOUT_MS: intFromEnv(12_000, 1_000, 60_000),
  COMPRAS_GOV_CACHE_TTL_SECONDS: intFromEnv(300, 0, 86_400),
  COMPRAS_GOV_MAX_PAGES: intFromEnv(3, 1, 20),
  COMPRAS_GOV_RETRY_ATTEMPTS: intFromEnv(2, 0, 5),
  COMPRAS_GOV_RATE_LIMIT_MS: intFromEnv(200, 0, 5_000),
  COMPRAS_GOV_UNIT_CODE: z.string().trim().optional(),
  COMPRAS_GOV_CATMAT_CODE: z.string().trim().optional(),
  COMPRAS_GOV_MODALITY_CODE: z.string().trim().optional(),
  COMPRAS_GOV_DATE_START: z.string().trim().optional(),
  COMPRAS_GOV_DATE_END: z.string().trim().optional(),
  COMPRAS_GOV_SITUATION: z.string().trim().optional(),
  COMPRAS_GOV_KEYWORD: z.string().trim().optional(),
});

export type ComprasGovConfig = ReturnType<typeof getComprasGovConfig>;

function defaultDateRange() {
  const year = new Date().getUTCFullYear();
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function getComprasGovConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.parse(env);
  const range = defaultDateRange();

  return {
    baseUrl: parsed.COMPRAS_GOV_API_BASE_URL.replace(/\/$/, ""),
    syncEnabled: parsed.COMPRAS_GOV_SYNC_ENABLED,
    pageSize: parsed.COMPRAS_GOV_PAGE_SIZE,
    requestTimeoutMs: parsed.COMPRAS_GOV_REQUEST_TIMEOUT_MS,
    cacheTtlSeconds: parsed.COMPRAS_GOV_CACHE_TTL_SECONDS,
    maxPages: parsed.COMPRAS_GOV_MAX_PAGES,
    retryAttempts: parsed.COMPRAS_GOV_RETRY_ATTEMPTS,
    rateLimitMs: parsed.COMPRAS_GOV_RATE_LIMIT_MS,
    filters: {
      unitCode: parsed.COMPRAS_GOV_UNIT_CODE,
      catmatCode: parsed.COMPRAS_GOV_CATMAT_CODE,
      modalityCode: parsed.COMPRAS_GOV_MODALITY_CODE,
      dateStart: parsed.COMPRAS_GOV_DATE_START ?? range.start,
      dateEnd: parsed.COMPRAS_GOV_DATE_END ?? range.end,
      situation: parsed.COMPRAS_GOV_SITUATION,
      keyword: parsed.COMPRAS_GOV_KEYWORD,
    },
  };
}
