import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("economic operations exposes simulation endpoint for m365 execution", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/routes/economic-operations.ts"), "utf8");
  assert.equal(src.includes("/simulation/:executionId"), true);
  assert.equal(src.includes("EXECUTION_READY_NOT_LIVE_ENABLED"), true);
});

test("intent service supports reclaim lifecycle intents", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/lib/economic-operations-intent-service.ts"), "utf8");
  for (const intent of ["REJECT", "REQUEST_MORE_EVIDENCE", "MARK_MANUAL_ONLY", "ACKNOWLEDGE_DRIFT"]) {
    assert.equal(src.includes(intent), true);
  }
});


test("intent route includes live execution gating and verify endpoint", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/routes/economic-operations.ts"), "utf8");
  assert.equal(src.includes("M365_LIVE_LICENSE_MUTATION_ENABLED"), true);
  assert.equal(src.includes("removeUserLicenses"), true);
  assert.equal(src.includes("/verify/:executionId"), true);
  assert.equal(src.includes("removeUserLicenses"), true);
});


test("verification route models deterministic statuses and drift fields", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/routes/economic-operations.ts"), "utf8");
  for (const t of ["PENDING_VERIFICATION","PARTIALLY_VERIFIED","VERIFIED","FAILED_VERIFICATION","VERIFICATION_EXPIRED","DRIFT_DETECTED","verificationEvidence","evidenceHash"]) {
    assert.equal(src.includes(t), true);
  }
});


test("readiness gate service and route are wired", () => {
  const routeSrc = fs.readFileSync(path.resolve(process.cwd(), "src/routes/connectors.ts"), "utf8");
  assert.equal(routeSrc.includes("/m365/live-execution/readiness"), true);
  const econSrc = fs.readFileSync(path.resolve(process.cwd(), "src/routes/economic-operations.ts"), "utf8");
  assert.equal(econSrc.includes("READINESS_PROOF"), true);
  assert.equal(econSrc.includes("evaluateM365LiveExecutionReadiness"), true);
});


test("rollback readiness and scaffold wiring present", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/routes/economic-operations.ts"), "utf8");
  assert.equal(src.includes("/rollback/:executionId/readiness"), true);
  assert.equal(src.includes("evaluateM365RollbackReadiness"), true);
  assert.equal(src.includes("ROLLBACK_READY_NOT_LIVE_ENABLED"), true);
  assert.equal(src.includes("reassignUserLicenses"), true);
});
