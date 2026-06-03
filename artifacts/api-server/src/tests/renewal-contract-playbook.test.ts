import test from "node:test";
import assert from "node:assert/strict";
import { buildDemoRenewalContractInput, renewalContractPlaybook, runRenewalContractPlaybook } from "../lib/playbooks/renewals/renewal-contract-playbook";

const types = (result: ReturnType<typeof runRenewalContractPlaybook>) => result.findings.map((finding) => finding.findingType);

test("renewal contract playbook detects required renewal risks", () => {
  const result = runRenewalContractPlaybook(buildDemoRenewalContractInput("2026-06-02T00:00:00.000Z"));
  assert.equal(result.executionRequired, false);
  for (const expected of ["UPCOMING_RENEWAL", "HIGH_COST_LOW_USAGE_RENEWAL", "DUPLICATE_VENDOR_RENEWAL", "OWNER_GAP", "MISSING_USAGE_DATA", "NEGOTIATION_OPPORTUNITY", "CONSOLIDATION_BEFORE_RENEWAL"] as const) assert.ok(types(result).includes(expected), expected);
});

test("renewal contract playbook detects missing cost and retirement candidates", () => {
  const result = runRenewalContractPlaybook({ asOfDate: "2026-06-02T00:00:00.000Z", contracts: [{ id: "free-or-unknown", vendorName: "Unknown Vendor", applicationName: "Unknown App", assignedUsers: 10, activeUsers: 1, utilisationRate: 0.1, evidenceRefs: ["contract:unknown"] }] });
  assert.ok(types(result).includes("MISSING_COST_DATA"));
  assert.ok(types(result).includes("RETIREMENT_CANDIDATE"));
});

test("renewal contract playbook includes demo vendors calendar evidence and no execution", () => {
  const input = buildDemoRenewalContractInput("2026-06-02T00:00:00.000Z");
  const result = renewalContractPlaybook.evaluate(input);
  for (const vendor of ["Slack", "Zoom", "Tableau", "Dropbox", "Figma", "HubSpot", "Miro", "Claude", "Box"]) assert.ok(input.contracts.some((contract) => contract.applicationName === vendor), vendor);
  assert.ok(result.renewalCalendar.some((window) => window.label === "31–60 days" && window.findings.length > 0));
  assert.ok(result.evidenceRefs.length > 0);
  assert.equal(renewalContractPlaybook.executionRequired, false);
});

