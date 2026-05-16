import test from "node:test";
import assert from "node:assert/strict";
import { buildExplainabilityEnvelope } from "../lib/recommendations/explainability-surface";

test("buildExplainabilityEnvelope returns deterministic evidence lineage order", () => {
  const out = buildExplainabilityEnvelope({
    id: 12,
    tenantId: "default",
    playbookId: "m365_inactive_user_reclaim",
    playbookName: "Inactive User Reclaim",
    status: "pending",
    recommendationStatus: "READY_FOR_ORCHESTRATION",
    playbookEvidence: { hasLicense: true, daysInactive: 120 },
    evidenceSummary: {
      explainability: {
        version: "checkpoint-24-v1",
        whyExists: "PLAYBOOK_MATCH",
      },
    },
  });

  assert.deepEqual(out.evidenceLineage.canonicalOrder, ["daysInactive", "hasLicense"]);
  assert.equal(out.explainabilityVersion, "checkpoint-24-v1");
  assert.equal(out.explainability.whyExists, "PLAYBOOK_MATCH");
});

