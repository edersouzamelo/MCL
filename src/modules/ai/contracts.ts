import { z } from "zod";
import type { RouteActor } from "@/modules/auth/route-actor";

export const MCL_AI_SCOPES = [
  "Piloto Classe II",
  "Art. 86 (Lei 14.133)",
  "CATMAT & Atas",
  "Todos os Dados",
] as const;

export const chatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4_000),
});

export const mclChatRequestSchema = z.object({
  prompt: z.string().trim().min(1).max(4_000),
  scope: z.enum(MCL_AI_SCOPES).default("Todos os Dados"),
  history: z.array(chatHistoryMessageSchema).max(8).default([]),
});

export type MclChatRequest = z.infer<typeof mclChatRequestSchema>;

export type Citation = {
  title: string;
  source: string;
  url?: string;
  asOf?: string;
  dataNature?: string;
};

export type AiUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type RagResponse = {
  answer: string;
  citations: Citation[];
  suggestedQuestions: string[];
  warnings: string[];
  requestId: string;
  provider: "vercel-ai-gateway" | "mcl-deterministic";
  model: string;
  authMode: "oidc" | "session-rbac";
  usage?: AiUsage;
};

export type MclToolEnvelope<T> = {
  status: "AVAILABLE" | "UNAVAILABLE" | "BLOCKED";
  dataNature:
    | "VERSIONED_KNOWLEDGE"
    | "LIVE_OFFICIAL"
    | "PERSISTED_OPERATIONAL"
    | "CALCULATED_FROM_PERSISTED"
    | "NONE";
  asOf: string;
  citations: Citation[];
  gaps: string[];
  data: T;
};

export type MclAiActor = Pick<RouteActor, "id" | "organizationId" | "roles">;

export class MclAiServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = "MclAiServiceError";
  }
}
