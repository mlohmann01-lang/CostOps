import { createRequire as __createRequire } from 'node:module';
import { fileURLToPath as __fileURLToPath } from 'node:url';
import { dirname as __pathDirname } from 'node:path';
const require = __createRequire(import.meta.url);
const __filename = __fileURLToPath(import.meta.url);
const __dirname = __pathDirname(__filename);

// src/tests/kubernetes-contract-migration.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// src/lib/contract-migration/_base.ts
var migrate = (input) => {
  const replay = { replayId: input.replayId, timestamp: input.timestamp, version: "v1" };
  const lineage = { lineageId: input.lineageId, sourceSystem: input.sourceSystem, entityId: input.domain };
  const evidence = input.recommendations.map((r, i) => ({ id: r.evidenceRefs?.[0] ?? `${input.domain}-ev-${i + 1}`, source: input.sourceSystem, capturedAt: input.timestamp, confidence: r.confidence ?? 0.8, lineage, replay }));
  const recommendations = input.recommendations.map((r, i) => ({ id: r.id, domain: input.domain, title: r.title, reviewMode: "APPROVAL_REQUIRED", evidence: [evidence[i]] }));
  return { domain: input.domain, evidence, lineage, replay, recommendations, forecast: { startDate: "2026-01-01", endDate: "2026-03-31", horizonDays: 90 }, calibration: { historicalWeight: 0.7, decayFactor: 0.1, recurrenceWeight: 0.6, stabilityWeight: 0.8 }, confidence: { score: Math.min(1, Math.max(0, recommendations.length ? evidence.reduce((a, b) => a + b.confidence, 0) / recommendations.length : 0)), dimensions: { evidenceCompleteness: 1, confidenceStability: 0.8 } }, severity: { score: 0.6, tier: "MEDIUM" }, governance: { classification: "REVIEW_REQUIRED", rationale: "Deterministic governance-only migration output", requiresApproval: true } };
};
var base_default = migrate;

// src/lib/contract-migration/kubernetes-contract-migration.ts
var migrateKubernetesContracts = (input) => base_default({ ...input, domain: "kubernetes" });

// src/tests/kubernetes-contract-migration.test.ts
test("migrateKubernetesContracts", () => {
  const out = migrateKubernetesContracts({ domain: "x", recommendations: [{ id: "r1", title: "t1" }], replayId: "r", lineageId: "l", sourceSystem: "s", timestamp: "2026-01-01T00:00:00.000Z" });
  assert.equal(out.governance.requiresApproval, true);
  assert.equal(out.recommendations[0].reviewMode, "APPROVAL_REQUIRED");
});
