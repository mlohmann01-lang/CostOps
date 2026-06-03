import test from "node:test";
import assert from "node:assert/strict";
import { generateAIGovernanceOpportunity } from "../lib/playbooks/ai-governance/ai-governance-opportunity-provider";
import type { AIGovernanceFinding } from "../lib/playbooks/ai-governance/ai-governance-types";

const base: Omit<AIGovernanceFinding, "id" | "findingType"> = { applicationName: "ChatGPT", riskLevel: "HIGH", usersDetected: 10, approved: false, trustScore: 80, rationale: "review", recommendedAction: "act", evidenceRefs: ["evidence:1"] };

test("AI governance opportunity calculates savings only when supported", () => {
  const findings: AIGovernanceFinding[] = [
    { ...base, id: "spend", findingType: "UNMANAGED_AI_SPEND", estimatedAnnualSpend: 1200, potentialAnnualSavings: 1200 },
    { ...base, id: "owner", findingType: "AI_OWNER_GAP" },
    { ...base, id: "duplicate", findingType: "DUPLICATE_AI_TOOLING", estimatedAnnualSpend: 500, potentialAnnualSavings: 100 },
  ];
  const opportunity = generateAIGovernanceOpportunity(findings);
  assert.equal(opportunity.potentialAnnualSavings, 1300);
  assert.equal(opportunity.findingsWithSavings.length, 2);
  assert.equal(opportunity.governanceOnlyFindings.some((finding) => finding.findingType === "AI_OWNER_GAP"), true);
});
