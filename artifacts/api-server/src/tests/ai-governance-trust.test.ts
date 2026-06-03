import test from "node:test";
import assert from "node:assert/strict";
import { scoreAIGovernanceTrust } from "../lib/playbooks/ai-governance/ai-governance-trust";

test("AI governance trust scores complete and incomplete evidence", () => {
  const high = scoreAIGovernanceTrust({ ownerKnown: true, approvalStatusKnown: true, usageEvidenceAvailable: true, spendEstimateAvailable: true, applicationMetadataAvailable: true, evidenceRefsAvailable: true });
  const low = scoreAIGovernanceTrust({ ownerKnown: false, approvalStatusKnown: false, usageEvidenceAvailable: false, spendEstimateAvailable: false, applicationMetadataAvailable: false, evidenceRefsAvailable: false });
  assert.equal(high.trustBand, "HIGH");
  assert.ok(high.trustScore > low.trustScore);
  assert.ok(low.trustBand === "LOW" || low.trustBand === "BLOCKED");
});
