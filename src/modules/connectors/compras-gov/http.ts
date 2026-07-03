import { setTimeout as delay } from "node:timers/promises";
import type { ZodSchema } from "zod";
import type { ComprasGovConfig } from "./config";

type CacheEntry = {
  expiresAt: number;
  data: unknown;
};

type FetchLike = typeof fetch;

const responseCache = new Map<string, CacheEntry>();
let lastRequestAt = 0;

export class ComprasGovHttpError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ComprasGovHttpError";
  }
}

function buildUrl(baseUrl: string, endpoint: string, params: Record<string, string | number | boolean | undefined>) {
  const url = new URL(endpoint, `${baseUrl}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function sanitizeErrorMessage(error: unknown) {
  if (error instanceof ComprasGovHttpError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.name === "AbortError" ? "Tempo limite atingido ao consultar Compras.gov.br." : error.message.slice(0, 240);
  }
  return "Falha desconhecida ao consultar Compras.gov.br.";
}

function shouldRetry(error: unknown) {
  if (error instanceof ComprasGovHttpError) {
    return error.status === undefined || error.status === 429 || error.status >= 500;
  }
  return true;
}

async function waitRateLimit(rateLimitMs: number) {
  if (rateLimitMs <= 0) {
    return;
  }
  const elapsed = Date.now() - lastRequestAt;
  if (elapsed < rateLimitMs) {
    await delay(rateLimitMs - elapsed);
  }
  lastRequestAt = Date.now();
}

export function createComprasGovClient(config: ComprasGovConfig, fetchImpl: FetchLike = fetch) {
  async function getJson<T>(
    endpoint: string,
    params: Record<string, string | number | boolean | undefined>,
    schema: ZodSchema<T>,
  ): Promise<{ data: T; url: string; cached: boolean }> {
    const url = buildUrl(config.baseUrl, endpoint, params);
    const cacheKey = url.toString();
    const cached = responseCache.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      return { data: schema.parse(cached.data), url: cacheKey, cached: true };
    }

    let lastError: unknown;
    for (let attempt = 0; attempt <= config.retryAttempts; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
      try {
        await waitRateLimit(config.rateLimitMs);
        const response = await fetchImpl(url, {
          headers: { accept: "application/json" },
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new ComprasGovHttpError(`Compras.gov.br respondeu HTTP ${response.status}.`, response.status);
        }

        const json = (await response.json()) as unknown;
        const data = schema.parse(json);
        if (config.cacheTtlSeconds > 0) {
          responseCache.set(cacheKey, { data: json, expiresAt: Date.now() + config.cacheTtlSeconds * 1000 });
        }
        return { data, url: cacheKey, cached: false };
      } catch (error) {
        lastError = error;
        if (attempt >= config.retryAttempts || !shouldRetry(error)) {
          break;
        }
        await delay(150 * 2 ** attempt);
      } finally {
        clearTimeout(timeout);
      }
    }

    throw new ComprasGovHttpError(sanitizeErrorMessage(lastError), lastError instanceof ComprasGovHttpError ? lastError.status : undefined);
  }

  return { getJson };
}

export function clearComprasGovCache() {
  responseCache.clear();
}
