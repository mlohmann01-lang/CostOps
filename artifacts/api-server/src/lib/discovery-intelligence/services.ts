import { randomUUID } from "node:crypto";
import { OperationalGraphService } from "../operational-graph/service";
import type { DiscoveryFinding, DiscoverySignal } from "./types";
import { discoverySignalSchema } from "./validation";
import { classifyReliability, freshnessFromObservedAt, transitionLifecycle } from "./lifecycle-engine";

export class DiscoveryOrchestrator {
  constructor(private readonly graph = new OperationalGraphService()) {}
  async run(tenantId: string, signals: DiscoverySignal[]) {
    const runId = randomUUID();
    const findings: DiscoveryFinding[] = [];
    const seenKeys = new Set<string>();
    for (const signal of signals) {
      const parsedSignal = discoverySignalSchema.parse(signal);
      const nodeKey = `${parsedSignal.entityType}:${parsedSignal.externalId}`.toLowerCase();
      const duplicate = seenKeys.has(nodeKey);
      seenKeys.add(nodeKey);
      const stale = freshnessFromObservedAt(parsedSignal.observedAt) === "STALE";
      const unresolvedIdentity = parsedSignal.confidence < 0.5 || duplicate;
      const state = stale ? "STALE" : unresolvedIdentity ? "UNRESOLVED" : parsedSignal.confidence >= 0.9 ? "TRUSTED" : "MATCHED";
      const transition = transitionLifecycle({ current: "DISCOVERED", target: state === "TRUSTED" ? "NORMALIZED" : state });
      const reliabilityBand = classifyReliability(parsedSignal.confidence);
      const evidence = [{ sourceSystem: signal.source, sourceReferenceId: signal.externalId, observedAt: signal.observedAt, confidence: signal.confidence, details: signal.attributes ?? {} }];
      const node = await this.graph.createNode({ tenantId, entityType: signal.entityType, canonicalName: signal.displayName, canonicalKey: nodeKey, confidenceScore: signal.confidence, evidence, runId, metadata: { sourceSystem: signal.source, sourceReference: signal.externalId, observedAt: signal.observedAt, ingestedAt: new Date().toISOString(), freshnessStatus: stale ? "STALE" : "FRESH", confidenceScore: signal.confidence, reliabilityBand, lifecycleState: state, lifecycleReason: transition.reason, validationWarnings: [], validationErrors: transition.ok ? [] : [transition.reason], lineage: { runId } } });
      findings.push({ tenantId, runId, signal, evidence, conflicts: duplicate ? ["DUPLICATE_ENTITY_CLUSTER"] : [], state, sourceReliabilityScore: signal.confidence, discoveryConfidenceScore: signal.confidence, unresolvedIdentity, stale });
      for (const rel of parsedSignal.relatedTo ?? []) {
        await this.graph.createEdge({ tenantId, fromEntityId: String(node.id), toEntityId: rel.canonicalKey, relationshipType: rel.relationshipType, confidenceScore: rel.confidence, evidence, runId });
      }
    }
    return { runId, findings };
  }
}
