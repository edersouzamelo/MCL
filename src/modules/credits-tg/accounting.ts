export type CurrentExecutionInput = {
  provisionUpdatedCents: number;
  committedCents: number;
  liquidatedCents: number;
};

export type RpnpExecutionInput = {
  registeredAndReinscribedCents: number;
  liquidatedCents: number;
  cancelledCents: number;
};

function assertCents(values: Record<string, number>) {
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isSafeInteger(value)) throw new Error(`${name} deve ser informado em centavos inteiros.`);
  }
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? null : numerator / denominator;
}

/** Relações contábeis observadas e reconciliadas com o Power BI de referência. */
export function deriveCurrentExecution(input: CurrentExecutionInput) {
  assertCents(input);
  return {
    ...input,
    availableCreditCents: input.provisionUpdatedCents - input.committedCents,
    committedToLiquidateCents: input.committedCents - input.liquidatedCents,
    committedRatio: ratio(input.committedCents, input.provisionUpdatedCents),
    liquidatedRatio: ratio(input.liquidatedCents, input.provisionUpdatedCents),
  };
}

/** RPNP a liquidar = inscrito/reinscrito - liquidado - cancelado. */
export function deriveRpnpExecution(input: RpnpExecutionInput) {
  assertCents(input);
  return {
    ...input,
    toLiquidateCents: input.registeredAndReinscribedCents - input.liquidatedCents - input.cancelledCents,
    liquidatedRatio: ratio(input.liquidatedCents, input.registeredAndReinscribedCents),
    cancelledRatio: ratio(input.cancelledCents, input.registeredAndReinscribedCents),
  };
}
