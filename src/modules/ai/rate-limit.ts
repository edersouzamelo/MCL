import { MclAiServiceError } from "@/modules/ai/contracts";

const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 10;

type RateLimitEntry = {
  startedAt: number;
  count: number;
};

const globalForAiRateLimit = globalThis as typeof globalThis & {
  mclAiRateLimits?: Map<string, RateLimitEntry>;
};

function store() {
  globalForAiRateLimit.mclAiRateLimits ??= new Map<string, RateLimitEntry>();
  return globalForAiRateLimit.mclAiRateLimits;
}

export function assertMclAiRateLimit(actorId: string, now = Date.now()) {
  const limits = store();
  for (const [key, value] of limits) {
    if (now - value.startedAt >= WINDOW_MS) limits.delete(key);
  }

  const current = limits.get(actorId);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    limits.set(actorId, { startedAt: now, count: 1 });
    return;
  }
  if (current.count >= REQUESTS_PER_WINDOW) {
    throw new MclAiServiceError(
      "AI_USER_RATE_LIMITED",
      "Limite de 10 consultas do Assistente por minuto atingido para este usuário.",
      429,
      true,
    );
  }
  current.count += 1;
}

export function resetMclAiRateLimitsForTests() {
  if (process.env.NODE_ENV === "test") store().clear();
}
