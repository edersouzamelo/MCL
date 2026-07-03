import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DemoState, ObjectLink, Role } from "@/modules/domain/types";

export const acquisitionLinkInputSchema = z.object({
  needId: z.string().min(1),
  acquisitionInstrumentId: z.string().min(1),
  justification: z.string().min(12).max(800),
  confidence: z.coerce.number().min(0).max(1).default(0.6),
});

export type AcquisitionLinkInput = z.infer<typeof acquisitionLinkInputSchema>;

export function canManageAcquisitionLinks(roles: Role[] = []) {
  return roles.includes("ADMIN") || roles.includes("LOGISTICS_MANAGER");
}

export function linkNeedToAcquisitionInstrument(
  state: DemoState,
  input: AcquisitionLinkInput,
  roles: Role[],
  actorId: string,
) {
  if (!canManageAcquisitionLinks(roles)) {
    throw new Error("Apenas LOGISTICS_MANAGER ou ADMIN podem vincular necessidades a instrumentos.");
  }

  const parsed = acquisitionLinkInputSchema.parse(input);
  const need = state.needs.find((candidate) => candidate.id === parsed.needId);
  if (!need) {
    throw new Error("Necessidade nao localizada.");
  }

  const instrument = state.acquisitionInstruments.find((candidate) => candidate.id === parsed.acquisitionInstrumentId);
  if (!instrument) {
    throw new Error("Instrumento de aquisicao nao localizado.");
  }

  if (instrument.sourceSystem !== "COMPRAS_GOV") {
    throw new Error("O vinculo manual deste fluxo aceita apenas instrumentos coletados da API publica Compras.gov.br.");
  }

  const duplicate = state.objectLinks.find(
    (link) =>
      link.fromType === "NEED" &&
      link.fromId === parsed.needId &&
      link.relationType === "PODE_SER_ATENDIDA_POR" &&
      link.toType === "ACQUISITION_INSTRUMENT" &&
      link.toId === parsed.acquisitionInstrumentId,
  );

  if (duplicate) {
    return { link: duplicate, duplicate: true };
  }

  const link: ObjectLink = {
    id: randomUUID(),
    fromType: "NEED",
    fromId: parsed.needId,
    relationType: "PODE_SER_ATENDIDA_POR",
    toType: "ACQUISITION_INSTRUMENT",
    toId: parsed.acquisitionInstrumentId,
    sourceSystem: "MCL-MANUAL",
    sourceRecordId: `manual-link-${Date.now()}`,
    actorId,
    justification: parsed.justification,
    confidence: parsed.confidence,
    sourceOrigin: "MANUAL",
    createdAt: new Date().toISOString(),
  };

  state.objectLinks.unshift(link);
  return { link, duplicate: false };
}
