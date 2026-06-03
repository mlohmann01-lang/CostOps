import test from "node:test";
import assert from "node:assert/strict";
import { demoShadowITDiscoveryInput, runShadowITDiscoveryPlaybook, shadowITDiscoveryPlaybook } from "../lib/playbooks/shadow-it/shadow-it-discovery-playbook";

const input = {
  enterpriseApplications: [
    { id: "app-chatgpt", applicationName: "ChatGPT", approved: false, userCount: 34, category: "AI", permissions: ["Mail.Read"], lastActivityDays: 3 },
    { id: "app-grammarly", applicationName: "Grammarly", approved: false, userCount: 12, owner: "security@example.com", category: "Writing", lastActivityDays: 10 },
    { id: "app-miro", applicationName: "Miro", approved: true, userCount: 7, owner: "design@example.com", category: "Whiteboard", annualCostEstimate: 1260, lastActivityDays: 120 },
    { id: "app-lucid", applicationName: "Lucid", approved: true, userCount: 5, owner: "design@example.com", category: "Whiteboard", annualCostEstimate: 1000, lastActivityDays: 8 },
    { id: "app-orphan", applicationName: "Unknown CRM", approved: true, userCount: 3, category: "CRM", lastActivityDays: 5 },
  ],
  oauthApplications: [
    { id: "oauth-chatgpt", oauthAppId: "oauth-chatgpt", applicationName: "ChatGPT", approved: false, userCount: 34, permissions: ["Mail.Read"] },
  ],
  signInEvents: [
    { id: "signin-chatgpt", applicationId: "app-chatgpt", applicationName: "ChatGPT" },
    { id: "signin-miro", applicationId: "app-miro", applicationName: "Miro" },
    { id: "signin-lucid", applicationId: "app-lucid", applicationName: "Lucid" },
  ],
};

test("shadow IT playbook detects AI unknown orphan dormant duplicate and high-risk findings", () => {
  const result = runShadowITDiscoveryPlaybook(input);
  const findingTypes = result.findings.map((finding) => finding.findingType);
  assert.equal(result.executionRequired, false);
  assert.equal(result.platformLayer, "Discovery → Trust → Opportunity");
  assert.ok(findingTypes.includes("AI_APPLICATION"));
  assert.ok(findingTypes.includes("UNAPPROVED_APPLICATION"));
  assert.ok(findingTypes.includes("ORPHANED_APPLICATION"));
  assert.ok(findingTypes.includes("DORMANT_APPLICATION"));
  assert.ok(findingTypes.includes("DUPLICATE_CAPABILITY"));
  assert.ok(findingTypes.includes("HIGH_RISK_APPLICATION"));
  assert.ok(result.findings.every((finding) => finding.evidenceRefs.length > 0));
});

test("shadow IT playbook creates dashboard tile and opportunity layer", () => {
  const result = runShadowITDiscoveryPlaybook(input);
  assert.equal(result.dashboardTile.title, "Shadow IT Exposure");
  assert.equal(result.dashboardTile.applicationsDiscovered, 5);
  assert.equal(result.dashboardTile.aiApplications, 1);
  assert.equal(result.dashboardTile.duplicateCapabilityFindings, 2);
  assert.ok(result.dashboardTile.potentialAnnualSavings > 0);
  assert.ok(result.opportunities.some((opportunity) => opportunity.opportunityType === "GOVERNANCE_EXPOSURE" && opportunity.potentialAnnualSavings === undefined));
  assert.ok(result.opportunities.some((opportunity) => opportunity.opportunityType === "DUPLICATE_CONSOLIDATION" && Number(opportunity.potentialAnnualSavings) > 0));
});

test("shadow IT demo dataset produces realistic exposure findings", () => {
  const result = runShadowITDiscoveryPlaybook(demoShadowITDiscoveryInput);
  assert.equal(result.dashboardTile.applicationsDiscovered, 5);
  assert.ok(result.findings.some((finding) => finding.applicationName === "ChatGPT" && finding.findingType === "AI_APPLICATION"));
  assert.ok(result.findings.some((finding) => finding.applicationName === "Notion" && finding.findingType === "UNAPPROVED_APPLICATION"));
  assert.ok(result.findings.some((finding) => finding.applicationName === "Miro" && finding.findingType === "DORMANT_APPLICATION"));
});


test("shadow IT playbook class follows read-only playbook pattern", () => {
  const result = shadowITDiscoveryPlaybook.evaluate(input);
  assert.equal(shadowITDiscoveryPlaybook.playbookId, "shadow-it-discovery-v1");
  assert.equal(shadowITDiscoveryPlaybook.executionRequired, false);
  assert.ok(result.findings.length > 0);
});

test("shadow IT playbook detects unknown OAuth applications without write access", () => {
  const result = runShadowITDiscoveryPlaybook({
    oauthApplications: [{ id: "oauth-unknown", oauthAppId: "oauth-unknown", applicationName: "Mystery OAuth App", userCount: 4, consentType: "USER" }],
    signInEvents: [{ id: "signin-unknown-oauth", applicationName: "Mystery OAuth App" }],
  });
  const finding = result.findings.find((candidate) => candidate.findingType === "UNKNOWN_APPLICATION");
  assert.equal(result.executionRequired, false);
  assert.equal(finding?.applicationName, "Mystery OAuth App");
  assert.ok(finding?.evidenceRefs.includes("oauth-app:oauth-unknown"));
});
