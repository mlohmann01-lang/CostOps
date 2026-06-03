import test from "node:test";
import assert from "node:assert/strict";
import { aiApplicationDiscoveryPlaybook, demoAIGovernanceDiscoveryInput, runAIApplicationDiscoveryPlaybook } from "../lib/playbooks/ai-governance/ai-application-discovery-playbook";

const types = (result: ReturnType<typeof runAIApplicationDiscoveryPlaybook>) => result.findings.map((finding) => finding.findingType);

test("AI governance detects AI applications and remains read-only", () => {
  const result = runAIApplicationDiscoveryPlaybook(demoAIGovernanceDiscoveryInput);
  assert.equal(result.executionRequired, false);
  assert.equal(result.summary.aiApplicationsDetected, 7);
  for (const app of ["ChatGPT", "Claude", "Microsoft Copilot", "GitHub Copilot", "Cursor", "Perplexity", "Gemini"]) assert.ok(result.inventory.some((item) => item.applicationName === app), app);
});

test("AI governance detects unapproved owner policy duplicate exposure and high usage findings", () => {
  const result = runAIApplicationDiscoveryPlaybook(demoAIGovernanceDiscoveryInput);
  for (const expected of ["UNAPPROVED_AI_APPLICATION", "AI_OWNER_GAP", "AI_POLICY_GAP", "DUPLICATE_AI_TOOLING", "DATA_EXPOSURE_RISK", "SOURCE_CODE_EXPOSURE_RISK", "HIGH_USAGE_AI_APPLICATION", "UNMANAGED_AI_SPEND"] as const) assert.ok(types(result).includes(expected), expected);
});

test("AI governance generates governance score and evidence-backed findings", () => {
  const result = aiApplicationDiscoveryPlaybook.evaluate(demoAIGovernanceDiscoveryInput);
  assert.ok(result.governanceExposureScore > 0);
  assert.ok(result.policyCoverageScore >= 0);
  assert.ok(result.evidenceRefs.length > 0);
  assert.equal(aiApplicationDiscoveryPlaybook.executionRequired, false);
});
