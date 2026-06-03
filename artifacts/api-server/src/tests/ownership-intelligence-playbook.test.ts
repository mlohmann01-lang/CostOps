import test from "node:test";
import assert from "node:assert/strict";
import { buildDemoOwnershipInput, ownershipIntelligencePlaybook, runOwnershipIntelligencePlaybook } from "../lib/playbooks/ownership/ownership-intelligence-playbook";
const gaps = (result: ReturnType<typeof runOwnershipIntelligencePlaybook>) => result.findings.map((finding) => finding.gapType);

test("ownership intelligence detects required ownership gaps", () => {
  const result = runOwnershipIntelligencePlaybook(buildDemoOwnershipInput("2026-06-02T00:00:00.000Z"));
  for (const expected of ["NO_BUSINESS_OWNER", "NO_TECHNICAL_OWNER", "NO_BUDGET_OWNER", "NO_RENEWAL_OWNER", "NO_EXECUTIVE_SPONSOR", "UNKNOWN_COST_CENTRE", "OWNER_STALE", "OWNER_CONFLICT"] as const) assert.ok(gaps(result).includes(expected), expected);
  assert.equal(result.executionRequired, false);
});

test("ownership intelligence escalates critical ownership risk", () => {
  const result = runOwnershipIntelligencePlaybook({ asOfDate: "2026-06-02T00:00:00.000Z", applications: [{ id: "critical", vendorName: "Mega", applicationName: "Mega App", annualCost: 300000, renewalDate: "2026-07-01", sourceContext: ["RENEWALS"], evidenceRefs: ["contract:mega"] }] });
  assert.ok(result.findings.some((finding) => finding.riskLevel === "CRITICAL" && (finding.gapType === "NO_BUSINESS_OWNER" || finding.gapType === "NO_RENEWAL_OWNER")));
});

test("ownership intelligence demo includes expected vendors and exposed spend", () => {
  const input = buildDemoOwnershipInput("2026-06-02T00:00:00.000Z");
  const result = ownershipIntelligencePlaybook.evaluate(input);
  for (const vendor of ["Slack", "Zoom", "Tableau", "Dropbox", "ChatGPT", "Claude", "Box", "Miro", "Salesforce", "HubSpot"]) assert.ok(JSON.stringify(input).includes(vendor), vendor);
  assert.ok(result.opportunity.annualSpendWithoutOwner > 0);
  assert.ok(result.evidenceRefs.length > 0);
});
