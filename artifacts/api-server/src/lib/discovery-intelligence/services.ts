import { randomUUID } from "node:crypto";
import { OperationalGraphService } from "../operational-graph/service";
import type { DiscoveryFinding, DiscoverySignal } from "./types";

export class DiscoveryOrchestrator {
  constructor(private readonly graph = new OperationalGraphService()) {}
  async run(tenantId: string, signals: DiscoverySignal[]) {
    const runId = randomUUID();
    const findings: DiscoveryFinding[] = [];
    for (const signal of signals) {
      const evidence = [{ sourceSystem: signal.source, sourceReferenceId: signal.externalId, observedAt: signal.observedAt, confidence: signal.confidence, details: signal.attributes ?? {} }];
      const node = await this.graph.createNode({ tenantId, entityType: signal.entityType, canonicalName: signal.displayName, canonicalKey: `${signal.entityType}:${signal.externalId}`.toLowerCase(), confidenceScore: signal.confidence, evidence, runId, metadata: { freshnessObservedAt: signal.observedAt, sourceReliability: signal.confidence } });
      findings.push({ tenantId, runId, signal, evidence, conflicts: [] });
      for (const rel of signal.relatedTo ?? []) {
        await this.graph.createEdge({ tenantId, fromEntityId: String(node.id), toEntityId: rel.canonicalKey, relationshipType: rel.relationshipType, confidenceScore: rel.confidence, evidence, runId });
      }
    }
    return { runId, findings };
  }
}
