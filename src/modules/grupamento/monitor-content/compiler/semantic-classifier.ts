import { z } from "zod";
import { compilerHash } from "./scene-graph";
import type { CompilerDiagnostic } from "./contracts";

export const semanticDecisionSchema = z.object({
  archetype: z.enum(["COVER", "CHART_CENTRIC", "TABLE_CENTRIC", "DOCUMENT_LIKE", "IMAGE_FULLFRAME", "TEXT_CENTRIC", "MIXED", "UNKNOWN"]),
  confidence: z.number().min(0).max(1),
  objects: z.array(z.object({ id: z.string().max(120), role: z.enum(["title", "body", "chart_annotation", "protected", "unknown"]), belongsTo: z.string().max(120).optional() })).max(200),
});
export type SemanticDecision = z.infer<typeof semanticDecisionSchema>;
export type SemanticClassifier = { model: string; classify(graph: unknown): Promise<unknown>; getCached(key: string): Promise<unknown | null>; cache(key: string, decision: SemanticDecision): Promise<void> };

/** The model may label existing IDs. It cannot add numbers, delete objects,
 * produce layout, authorize publication or override a failed fidelity check. */
export async function classifyAmbiguity(diagnostic: CompilerDiagnostic, classifier?: SemanticClassifier) {
  if (diagnostic.interpretedContent.confidence >= .85) return diagnostic;
  if (!classifier) { diagnostic.llm.cache = "DISABLED"; return diagnostic; }
  const graph = { version: diagnostic.version, nodes: diagnostic.parsedInput.nodes, relations: diagnostic.interpretedContent.relations, issues: diagnostic.parsedInput.issues };
  const key = compilerHash({ graph, rawHash: diagnostic.source.rawHash, model: classifier.model, contract: 1 });
  diagnostic.llm.model = classifier.model;
  try {
    const cached = await classifier.getCached(key);
    diagnostic.llm.cache = cached ? "HIT" : "MISS";
    const value = cached ?? await (async () => { diagnostic.llm.calls++; return classifier.classify(graph); })();
    const decision = semanticDecisionSchema.parse(value);
    const ids = new Set(diagnostic.parsedInput.nodes.map(node => node.id));
    if (decision.objects.some(object => !ids.has(object.id) || object.belongsTo && (!ids.has(object.belongsTo) || object.id === object.belongsTo)) || new Set(decision.objects.map(object => object.id)).size !== decision.objects.length) throw new Error("Classificação semântica referencia objetos inválidos ou repetidos.");
    diagnostic.interpretedContent.archetype = decision.archetype;
    // Confidence is a classifier score, not a measured fidelity probability.
    diagnostic.interpretedContent.confidence = decision.confidence;
    for (const object of decision.objects) if (object.belongsTo) diagnostic.interpretedContent.relations.push({ from: object.id, to: object.belongsTo, type: object.role === "chart_annotation" ? "belongs_to_chart" : "unknown_relation", confidence: decision.confidence });
    if (!cached) await classifier.cache(key, decision);
  } catch (error) { diagnostic.llm.rejected = error instanceof Error ? error.message : "Classificador indisponível."; }
  return diagnostic;
}
