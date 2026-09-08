import { gateway, type LanguageModel } from "ai";
import { MclAiServiceError } from "@/modules/ai/contracts";

export const DEFAULT_MCL_AI_MODEL = "openai/gpt-5-mini";
export const MCL_AI_PROVIDER = "vercel-ai-gateway" as const;
export const MCL_AI_AUTH_MODE = "oidc" as const;

export type MclModelConfiguration = {
  provider: typeof MCL_AI_PROVIDER;
  authMode: typeof MCL_AI_AUTH_MODE;
  modelId: string;
  model: LanguageModel;
};

function configuredModelId() {
  const value = process.env.MCL_AI_MODEL?.trim() || DEFAULT_MCL_AI_MODEL;
  if (!/^[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/i.test(value)) {
    throw new MclAiServiceError(
      "INVALID_AI_MODEL",
      "MCL_AI_MODEL deve usar o formato provedor/modelo do Vercel AI Gateway.",
      500,
    );
  }
  return value;
}

export function assertOidcRuntimeAvailable() {
  if (process.env.NODE_ENV === "test") return;

  if (!process.env.VERCEL_OIDC_TOKEN) {
    throw new MclAiServiceError(
      "AI_GATEWAY_OIDC_UNAVAILABLE",
      "O runtime atual não recebeu a identidade OIDC da Vercel. Publique em um projeto Vercel com AI Gateway habilitado ou use o ambiente local vinculado pela CLI da Vercel.",
      503,
      false,
    );
  }
}

export function resolveMclModel(): MclModelConfiguration {
  const requestedProvider = process.env.MCL_AI_PROVIDER?.trim() || "vercel-oidc";
  if (requestedProvider !== "vercel-oidc") {
    throw new MclAiServiceError(
      "UNSUPPORTED_AI_PROVIDER",
      `O provedor '${requestedProvider}' ainda não está implementado. Use MCL_AI_PROVIDER=vercel-oidc.`,
      500,
    );
  }

  const modelId = configuredModelId();
  return {
    provider: MCL_AI_PROVIDER,
    authMode: MCL_AI_AUTH_MODE,
    modelId,
    model: gateway(modelId),
  };
}
