import test from "node:test";
import assert from "node:assert/strict";
import { demoSaaSRationalisationInput, runSaaSRationalisationPlaybook, saasRationalisationPlaybook } from "../lib/playbooks/saas-rationalisation/saas-rationalisation-playbook";

const byType = (result: ReturnType<typeof runSaaSRationalisationPlaybook>) => result.findings.map((finding) => finding.findingType);

test("SaaS rationalisation detects duplicate capability and consolidation candidates", () => {
  const result = runSaaSRationalisationPlaybook(demoSaaSRationalisationInput);
  assert.equal(result.executionRequired, false);
  assert.ok(byType(result).includes("DUPLICATE_CAPABILITY"));
  assert.ok(byType(result).includes("CONSOLIDATION_CANDIDATE"));
  assert.ok(result.overlapGroups.some((group) => group.capabilityCategory === "COMMUNICATION"));
  assert.ok(result.overlapGroups.some((group) => group.capabilityCategory === "AI_PRODUCTIVITY"));
});

test("SaaS rationalisation detects underused dormant unmanaged owner gap renewal and high-cost-low-usage", () => {
  const result = runSaaSRationalisationPlaybook(demoSaaSRationalisationInput);
  const types = byType(result);
  for (const expected of ["UNDERUSED_VENDOR", "DORMANT_VENDOR", "UNMANAGED_VENDOR", "OWNER_GAP", "RENEWAL_RISK", "HIGH_COST_LOW_USAGE"] as const) assert.ok(types.includes(expected), expected);
});

test("SaaS rationalisation calculates only supported savings", () => {
  const result = runSaaSRationalisationPlaybook(demoSaaSRationalisationInput);
  assert.ok(result.opportunity.totalPotentialAnnualSavings > 0);
  assert.equal(result.findings.filter((finding) => finding.findingType === "UNMANAGED_VENDOR").every((finding) => finding.potentialAnnualSavings === undefined), true);
  assert.equal(result.findings.filter((finding) => finding.findingType === "OWNER_GAP").every((finding) => finding.potentialAnnualSavings === undefined), true);
  assert.ok(result.findings.some((finding) => finding.findingType === "DORMANT_VENDOR" && Number(finding.potentialAnnualSavings) > 0));
  assert.ok(result.findings.some((finding) => finding.findingType === "HIGH_COST_LOW_USAGE" && Number(finding.potentialAnnualSavings) > 0));
});

test("SaaS rationalisation demo contains required vendors and evidence", () => {
  const result = saasRationalisationPlaybook.evaluate(demoSaaSRationalisationInput);
  const vendors = demoSaaSRationalisationInput.applications.map((app) => app.applicationName).join(" | ");
  for (const vendor of ["Microsoft Teams", "Slack", "Zoom", "OneDrive", "Dropbox", "Box", "Miro", "Lucid", "Asana", "Monday", "Jira", "Figma", "Canva", "ChatGPT", "Microsoft Copilot", "Claude", "Salesforce", "HubSpot", "Tableau", "Power BI"]) assert.ok(vendors.includes(vendor), vendor);
  assert.ok(result.evidenceRefs.length > 0);
  assert.equal(saasRationalisationPlaybook.executionRequired, false);
});
