import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  evaluateDataClassification,
  evaluateRetentionPolicy,
  evaluateAccessGovernance,
  evaluateEncryptionGovernance,
  evaluateExportGovernance,
  evaluatePrivacyPosture,
  evaluateInformationGovernanceReadiness,
  getInformationGovernanceAuthority,
} from "../lib/information-governance/information-governance-authority";

test("classification engine: verbatim rules map deterministically", () => {
  const rules: Record<string, string> = {
    "OAuth Tokens": "RESTRICTED",
    "User Principal Names": "PII",
    "Email Addresses": "PII",
    "Display Names": "PII",
    "Tenant Metadata": "INTERNAL",
    "Technology Inventory": "INTERNAL",
    "Evidence Records": "CONFIDENTIAL",
    "Outcome Finance": "CONFIDENTIAL",
    "Audit Records": "CONFIDENTIAL",
    "Question Catalog": "SYSTEM_METADATA",
    "Question Responses": "INTERNAL",
  };
  for (const [category, expected] of Object.entries(rules)) {
    assert.equal(evaluateDataClassification(category), expected);
  }
  assert.equal(evaluateDataClassification("Unrecognised"), "UNKNOWN");
});

test("retention: OAuth Tokens is MISSING, Evidence Records is DEFINED, Outcome Finance Records is UNKNOWN", () => {
  assert.equal(evaluateRetentionPolicy("OAuth Tokens").status, "MISSING");
  assert.equal(evaluateRetentionPolicy("Evidence Records").status, "DEFINED");
  assert.equal(evaluateRetentionPolicy("Outcome Finance Records").status, "UNKNOWN");
  assert.equal(evaluateRetentionPolicy("Some Unverified Thing").status, "UNKNOWN");
});

test("access governance: Tenant Isolation is honestly PARTIAL, Role Based Access is READY", () => {
  const access = evaluateAccessGovernance();
  assert.equal(access.find((a) => a.area === "Tenant Isolation")?.status, "PARTIAL");
  assert.equal(access.find((a) => a.area === "Role Based Access")?.status, "READY");
});

test("encryption governance: Secrets Storage is READY, At Rest/In Transit are UNKNOWN", () => {
  const encryption = evaluateEncryptionGovernance();
  assert.equal(encryption.find((e) => e.area === "Secrets Storage")?.status, "READY");
  assert.equal(encryption.find((e) => e.area === "At Rest")?.status, "UNKNOWN");
  assert.equal(encryption.find((e) => e.area === "In Transit")?.status, "UNKNOWN");
});

test("export governance: all four areas are MISSING (no export functionality found)", () => {
  const exportControls = evaluateExportGovernance();
  assert.equal(exportControls.length, 4);
  for (const control of exportControls) assert.equal(control.status, "MISSING");
});

test("privacy posture: all four content questions resolve to NO, backed by scope guard evidence", () => {
  const privacy = evaluatePrivacyPosture();
  assert.equal(privacy.length, 4);
  for (const attribute of privacy) {
    assert.equal(attribute.answer, "NO");
    assert.ok(attribute.evidence.includes("m365-exposure-scope-guard"));
  }
});

test("readiness: score in range, status not fabricated as READY given current honest state", () => {
  const readiness = evaluateInformationGovernanceReadiness();
  assert.ok(readiness.score >= 0 && readiness.score <= 100);
  assert.ok(["READY", "PARTIAL", "MISSING"].includes(readiness.status));
  assert.notEqual(readiness.status, "READY");
});

test("readiness: emits VERIFY_TENANT_ISOLATION and DEFINE_RETENTION_POLICY recommendations", () => {
  const readiness = evaluateInformationGovernanceReadiness();
  assert.ok(readiness.recommendations.some((r) => r.type === "VERIFY_TENANT_ISOLATION"));
  assert.ok(readiness.recommendations.some((r) => r.type === "DEFINE_RETENTION_POLICY"));
});

test("authority model: includes all required sections with expected shapes", () => {
  const model = getInformationGovernanceAuthority();
  assert.ok(model.dataInventory.length > 0);
  assert.equal(model.accessGovernance.length, 5);
  assert.equal(model.encryptionGovernance.length, 3);
  assert.equal(model.exportGovernance.length, 4);
  assert.equal(model.privacyPosture.length, 4);
  assert.ok(model.readiness);
});

test("information-governance route exposes the four required read-only endpoints", async () => {
  const routeFile = await readFile("src/routes/information-governance.ts", "utf8");
  assert.ok(routeFile.includes('router.get("/"'));
  assert.ok(routeFile.includes('router.get("/readiness"'));
  assert.ok(routeFile.includes('router.get("/findings"'));
  assert.ok(routeFile.includes('router.get("/recommendations"'));
  // Read-only guarantee: no mutation verbs in this router.
  assert.equal(routeFile.includes("router.post("), false);
  assert.equal(routeFile.includes("router.put("), false);
  assert.equal(routeFile.includes("router.delete("), false);
});

test("information-governance router is mounted with tenant context and capability checks", async () => {
  const indexFile = await readFile("src/routes/index.ts", "utf8");
  assert.ok(indexFile.includes('router.use("/information-governance", requireTenantContext(), requireCapability("READ_RECOMMENDATIONS"), informationGovernanceRouter)'));
});
