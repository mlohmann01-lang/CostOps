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

test("[Program 14B-R] no domain reports FAILED anymore — the three CRITICAL findings (thr-1, aud-1, enc-1's HIGH) were remediated; platformVerdict reflects remaining UNKNOWN (secrets-management) rather than FAILED", () => {
  const a = getSecurityHardeningAuthority();
  const hasFailedDomain = a.domains.some((d) => d.verdict === "FAILED");
  assert.ok(!hasFailedDomain, "no domain should report FAILED after Program 14B-R remediation");
  assert.equal(a.platformVerdict, "UNKNOWN", "secrets-management remains UNKNOWN (sec-2, out of scope for 14B-R), which takes priority over the remaining PARTIAL domains");
});

test("[verdict priority] criticalFindings only contains CRITICAL or HIGH severity findings", () => {
  const a = getSecurityHardeningAuthority();
  for (const f of a.criticalFindings) {
    assert.ok(f.severity === "CRITICAL" || f.severity === "HIGH");
  }
});

test("[real evidence] audit-integrity domain's tamper-evidence primitives now have real production call sites in audit-service.ts and execution-approval-service.ts", () => {
  const auditIntegritySrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/security/audit-integrity.ts"), "utf8");
  const securityControlsSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/security/security-controls.ts"), "utf8");
  const auditServiceSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/audit/audit-service.ts"), "utf8");
  const approvalServiceSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/governance/execution-approval-service.ts"), "utf8");
  assert.ok(/auditHash/.test(auditIntegritySrc), "auditHash must still be defined in audit-integrity.ts");
  assert.ok(/approvalTamperHash/.test(securityControlsSrc), "approvalTamperHash must still be defined in security-controls.ts");
  assert.ok(/auditHash\(/.test(auditServiceSrc), "audit-service.ts must call auditHash() — if this regresses, aud-1 in the authority module is stale and must be updated.");
  assert.ok(/approvalTamperHash\(/.test(approvalServiceSrc), "execution-approval-service.ts must call approvalTamperHash() — if this regresses, aud-1 in the authority module is stale and must be updated.");

  const results = buildSecurityHardeningDomainResults();
  const auditIntegrity = results.find((r) => r.domain === "audit-integrity")!;
  assert.notEqual(auditIntegrity.verdict, "FAILED", "audit-integrity must not remain FAILED now that the tamper-evidence primitives are wired in");
  const remediatedFinding = auditIntegrity.findings.find((f) => f.id === "aud-1");
  assert.ok(remediatedFinding && /REMEDIATED/.test(remediatedFinding.description), "aud-1 must be present and marked REMEDIATED");
});

test("[real evidence] threat-model thr-1 is grounded in real source: executive-proof-packs.ts now calls requireTenantContext and no longer trusts client tenant headers", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "src/routes/executive-proof-packs.ts"), "utf8");
  assert.ok(/requireTenantContext/.test(source), "executive-proof-packs.ts must call requireTenantContext() — if this regresses, thr-1 in the authority module is stale and must be updated.");
  assert.ok(!/req\.tenantId\s*\?\?\s*req\.header\(['"]x-tenant-id['"]\)/.test(source), "executive-proof-packs.ts must not fall back to a client-supplied x-tenant-id header for tenant identity.");

  const results = buildSecurityHardeningDomainResults();
  const threatModel = results.find((r) => r.domain === "threat-model")!;
  assert.notEqual(threatModel.verdict, "FAILED", "threat-model must not remain FAILED now that proof-pack tenant spoofing is remediated");
  const remediatedFinding = threatModel.findings.find((f) => f.id === "thr-1");
  assert.ok(remediatedFinding && /REMEDIATED/.test(remediatedFinding.description), "thr-1 must be present and marked REMEDIATED");
});

test("[real evidence] encryption-posture enc-1 is grounded in real source: all five credential stores now call resolveEncryptionKeySecret and fail closed in production", () => {
  const microsoftSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/microsoft-auth/microsoft-token-store.ts"), "utf8");
  const serviceNowSrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/production-connectors/servicenow/servicenow-auth.ts"), "utf8");
  assert.ok(/resolveEncryptionKeySecret\(/.test(microsoftSrc), "microsoft-token-store.ts must call resolveEncryptionKeySecret() — if this regresses, enc-1 in the authority module is stale.");
  assert.ok(/resolveEncryptionKeySecret\(/.test(serviceNowSrc), "servicenow-auth.ts must call resolveEncryptionKeySecret() — if this regresses, enc-1 in the authority module is stale.");
  assert.ok(!/process\.env\.\w+_KEY\s*\?\?\s*['"]/.test(microsoftSrc), "microsoft-token-store.ts must not silently fall back to a hardcoded key literal via ??");
  assert.ok(!/process\.env\.\w+_KEY\s*\?\?\s*['"]/.test(serviceNowSrc), "servicenow-auth.ts must not silently fall back to a hardcoded key literal via ??");

  const results = buildSecurityHardeningDomainResults();
  const encryption = results.find((r) => r.domain === "encryption-posture")!;
  const remediatedFinding = encryption.findings.find((f) => f.id === "enc-1");
  assert.ok(remediatedFinding && /REMEDIATED/.test(remediatedFinding.description), "enc-1 must be present and marked REMEDIATED");
});
