// Program 14B-R — Remediation 2 regression suite: Audit Tamper Evidence.
//
// Program 14B found that auditHash/approvalTamperHash were defined but had
// zero production call sites — tamper evidence existed in theory but not in
// practice. The fix wires auditHash into recordAuditEvent() (audit-service.ts)
// as a per-tenant hash chain (prevHash -> tamperHash), and wires
// approvalTamperHash into ExecutionApprovalService's request/approve/reject
// transitions (execution-approval-service.ts).
//
// This file proves the hash math itself is deterministic, chained, and
// sensitive to payload mutation, without requiring a live database. The
// companion file audit-tamper-evidence-live.test.ts proves the same
// properties against the real Postgres-backed write paths and is gated by
// RUN_DB_INTEGRATION_TESTS, per the standard convention in
// scripts/run-pattern-tests.mjs.

import test from "node:test";
import assert from "node:assert/strict";
import { auditHash } from "../lib/security/audit-integrity";
import { approvalTamperHash } from "../lib/security/security-controls";

test("[Program 14B-R / Scenario 3 - audit] equivalent payloads produce a stable, deterministic hash", () => {
  const payload = { tenantId: "t1", actorId: "u1", eventType: "AUTH_LOGIN", resourceType: "session" };
  const h1 = auditHash("", payload);
  const h2 = auditHash("", { ...payload });
  assert.equal(h1, h2, "identical prevHash + payload must always produce the same hash");
  assert.equal(h1.length, 64, "sha256 hex digest is 64 characters");
});

test("[Program 14B-R / Scenario 2 - audit] modifying any field of an already-hashed payload changes the hash", () => {
  const payload = { tenantId: "t1", actorId: "u1", eventType: "AUTH_LOGIN", resourceType: "session" };
  const original = auditHash("", payload);
  const tampered = auditHash("", { ...payload, actorId: "attacker" });
  assert.notEqual(original, tampered, "a tampered payload must not hash to the same value");
});

test("[Program 14B-R / audit] hash chain: each event's hash depends on the previous event's hash, so reordering or deleting a row breaks the chain", () => {
  const event1 = { tenantId: "t1", actorId: "u1", eventType: "AUTH_LOGIN" };
  const event2 = { tenantId: "t1", actorId: "u1", eventType: "EXECUTION_REQUESTED" };

  const hash1 = auditHash("", event1);
  const hash2 = auditHash(hash1, event2);

  // Recomputing with the wrong prevHash (e.g. because an earlier row was
  // deleted or altered) produces a different chain link, detecting tampering.
  const hash2WithWrongPrev = auditHash("some-other-prev-hash", event2);
  assert.notEqual(hash2, hash2WithWrongPrev, "chain link must depend on prevHash, detecting upstream tampering");
});

test("[Program 14B-R / approval tamper hash] equivalent approval decision fields hash identically; any field change invalidates the hash", () => {
  const decision = {
    tenantId: "t1",
    entityType: "execution_request",
    entityId: "er-1",
    approvalType: "STANDARD",
    requiredApprovals: 1,
    currentApprovals: 0,
    approvalStatus: "PENDING",
    requestedBy: "u1",
    approvedBy: [],
    rejectedBy: [],
    approvalEvidence: {},
  };
  const h1 = approvalTamperHash(decision);
  const h2 = approvalTamperHash({ ...decision });
  assert.equal(h1, h2, "identical approval decision fields must hash identically");

  const approved = { ...decision, approvalStatus: "APPROVED", currentApprovals: 1, approvedBy: ["u2"] };
  const h3 = approvalTamperHash(approved);
  assert.notEqual(h1, h3, "an approval state transition must change the tamper hash");
});

test("[Program 14B-R regression] audit-service.ts and execution-approval-service.ts call the tamper-evidence primitives", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const auditServiceSource = fs.readFileSync(path.resolve(process.cwd(), "src/lib/audit/audit-service.ts"), "utf8");
  const approvalServiceSource = fs.readFileSync(path.resolve(process.cwd(), "src/lib/governance/execution-approval-service.ts"), "utf8");
  assert.ok(/auditHash\(/.test(auditServiceSource), "recordAuditEvent must call auditHash()");
  assert.ok(/record\.tamperHash\s*=/.test(auditServiceSource), "recordAuditEvent must persist a computed tamperHash");
  assert.ok(/approvalTamperHash\(/.test(approvalServiceSource), "ExecutionApprovalService must call approvalTamperHash()");
});
