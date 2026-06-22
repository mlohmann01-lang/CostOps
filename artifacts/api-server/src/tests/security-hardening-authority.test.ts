// Program 14B — Security Hardening Authority test suite (api-server mirror).
//
// Per the "honest data bias" constraint, these tests both (a) guard the
// authority model's own honesty — no domain claims VERIFIED without real
// evidence, confidence never claims full 1.0 — and (b) re-ground at least
// one CRITICAL finding directly against the real production source, so a
// regression in the cited code is caught for real, not just asserted.

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  SECURITY_HARDENING_DOMAIN_IDS,
  buildSecurityHardeningDomainResults,
  getSecurityHardeningAuthority,
} from "../lib/security-hardening/security-hardening-verification-authority";

test("6 security hardening domains are registered, matching the Program 14B spec", () => {
  assert.equal(SECURITY_HARDENING_DOMAIN_IDS.length, 6);
  const results = buildSecurityHardeningDomainResults();
  assert.equal(results.length, 6);
  const ids = new Set(results.map((r) => r.domain));
  for (const id of SECURITY_HARDENING_DOMAIN_IDS) assert.ok(ids.has(id));
  for (const expected of ["encryption-posture", "secrets-management", "token-lifecycle", "audit-integrity", "retention-controls", "threat-model"]) {
    assert.ok(ids.has(expected), `missing required domain ${expected}`);
  }
});

test("[meta] no domain reports VERIFIED — none of the six domains have full proof yet", () => {
  const results = buildSecurityHardeningDomainResults();
  for (const r of results) {
    assert.notEqual(r.verdict, "VERIFIED", `${r.domain} must not be VERIFIED without full proof`);
  }
});

test("[meta] every finding has a non-empty affectedFiles list and a substantive remediation", () => {
  const results = buildSecurityHardeningDomainResults();
  for (const r of results) {
    for (const f of r.findings) {
      assert.ok(f.affectedFiles.length > 0, `${r.domain} finding ${f.id} must cite at least one file`);
      assert.ok(f.remediation.length > 10, `${r.domain} finding ${f.id} must have a real remediation`);
    }
  }
});

test("[meta] every evidence item cites a file path and a classification-relevant description", () => {
  const results = buildSecurityHardeningDomainResults();
  for (const r of results) {
    assert.ok(r.evidence.length > 0, `${r.domain} must have at least one evidence item`);
    for (const e of r.evidence) {
      assert.ok(e.filePath.length > 0);
      assert.ok(e.description.length > 10);
      assert.ok(e.confidence >= 0 && e.confidence <= 1);
    }
  }
});

test("[meta] confidence scores are within [0,1) and never claim full (1.0) confidence anywhere", () => {
  const results = buildSecurityHardeningDomainResults();
  for (const r of results) {
    assert.ok(r.confidence >= 0 && r.confidence < 1, `${r.domain} should never claim full 1.0 confidence`);
    for (const e of r.evidence) {
      assert.ok(e.confidence >= 0 && e.confidence < 1);
    }
  }
});

test("[meta] every FAILED or UNKNOWN domain has at least one finding", () => {
  const results = buildSecurityHardeningDomainResults();
  for (const r of results) {
    if (r.verdict === "FAILED" || r.verdict === "UNKNOWN") {
      assert.ok(r.findings.length > 0, `${r.domain} (${r.verdict}) should have findings`);
    }
  }
});

test("authority executes and reports authority name, generatedAt, and a complete domain set", () => {
  const a = getSecurityHardeningAuthority();
  assert.equal(a.authority, "SECURITY_HARDENING_AUTHORITY");
  assert.ok(typeof a.generatedAt === "string" && a.generatedAt.length > 0);
  assert.equal(a.domains.length, 6);
});

test("[determinism] two calls to getSecurityHardeningAuthority() produce equal results", () => {
  const a = getSecurityHardeningAuthority();
  const b = getSecurityHardeningAuthority();
  assert.deepEqual(a, b);
});

test("[verdict priority] a FAILED domain forces platformVerdict to FAILED, regardless of other domains", () => {
  const a = getSecurityHardeningAuthority();
  const hasFailedDomain = a.domains.some((d) => d.verdict === "FAILED");
  assert.ok(hasFailedDomain, "at least one domain is expected to be FAILED given known unwired tamper-evidence and tenant-scoping gaps");
  assert.equal(a.platformVerdict, "FAILED");
});

test("[verdict priority] criticalFindings only contains CRITICAL or HIGH severity findings, and is non-empty given known gaps", () => {
  const a = getSecurityHardeningAuthority();
  assert.ok(a.criticalFindings.length > 0);
  for (const f of a.criticalFindings) {
    assert.ok(f.severity === "CRITICAL" || f.severity === "HIGH");
  }
});

test("[real evidence] audit-integrity domain's CRITICAL finding is grounded in real zero-call-site facts for auditHash and approvalTamperHash", () => {
  const auditIntegritySrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/security/audit-integrity.ts"), "utf8");
  const securityControlsSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/security/security-controls.ts"), "utf8");
  assert.ok(/auditHash/.test(auditIntegritySrc), "auditHash must still be defined in audit-integrity.ts");
  assert.ok(/approvalTamperHash/.test(securityControlsSrc), "approvalTamperHash must still be defined in security-controls.ts");

  // Re-check the zero-call-site claim directly against the real repo: walk
  // src/, excluding the two definition files and the tests directory, and
  // confirm neither symbol is referenced anywhere else. If a production
  // caller is added, this test fails loudly instead of silently passing.
  const srcRoot = path.resolve(process.cwd(), "src");
  const skip = new Set([
    path.resolve(srcRoot, "lib/security/audit-integrity.ts"),
    path.resolve(srcRoot, "lib/security/security-controls.ts"),
  ]);
  const skipDirs = new Set(["tests", "security-hardening"]);
  let foundExternalCallSite = false;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith(".ts") && !skip.has(full)) {
        const content = fs.readFileSync(full, "utf8");
        if (/auditHash|approvalTamperHash/.test(content)) foundExternalCallSite = true;
      }
    }
  };
  walk(srcRoot);

  const results = buildSecurityHardeningDomainResults();
  const auditIntegrity = results.find((r) => r.domain === "audit-integrity")!;
  const criticalFinding = auditIntegrity.findings.find((f) => f.severity === "CRITICAL");
  assert.ok(criticalFinding, "audit-integrity domain must have a CRITICAL finding about unwired tamper-evidence primitives");

  if (foundExternalCallSite) {
    assert.fail("auditHash or approvalTamperHash now has a production call site outside their definition files — the CRITICAL finding text in the authority module is stale and must be updated to reflect that the primitive is wired in.");
  }
});

test("[real evidence] threat-model CRITICAL finding is grounded in real source: executive-proof-packs.ts never calls requireTenantContext", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "src/routes/executive-proof-packs.ts"), "utf8");
  assert.ok(!/requireTenantContext/.test(source), "executive-proof-packs.ts now calls requireTenantContext() — the threat-model CRITICAL finding (thr-1) is stale and the authority module must be updated to reflect the fix.");
  assert.ok(/x-tenant-id/.test(source), "executive-proof-packs.ts must still derive tenant() with an x-tenant-id header fallback for this finding to remain accurate.");

  const results = buildSecurityHardeningDomainResults();
  const threatModel = results.find((r) => r.domain === "threat-model")!;
  const criticalFinding = threatModel.findings.find((f) => f.severity === "CRITICAL" && f.affectedFiles.some((p) => p.includes("executive-proof-packs.ts")));
  assert.ok(criticalFinding, "threat-model domain must have a CRITICAL finding citing executive-proof-packs.ts");
});

test("[real evidence] encryption-posture HIGH finding is grounded in real hardcoded fallback key literals", () => {
  const microsoftSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/microsoft-auth/microsoft-token-store.ts"), "utf8");
  const serviceNowSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/production-connectors/servicenow/servicenow-auth.ts"), "utf8");
  assert.ok(microsoftSrc.includes("local-dev-encryption-boundary"), "microsoft-token-store.ts must still contain its hardcoded fallback key literal for this finding to remain accurate");
  assert.ok(serviceNowSrc.includes("local-production-connector-key"), "servicenow-auth.ts must still contain its hardcoded fallback key literal for this finding to remain accurate");

  const results = buildSecurityHardeningDomainResults();
  const encryption = results.find((r) => r.domain === "encryption-posture")!;
  const highFinding = encryption.findings.find((f) => f.severity === "HIGH");
  assert.ok(highFinding, "encryption-posture domain must have a HIGH finding about hardcoded fallback keys");
});
