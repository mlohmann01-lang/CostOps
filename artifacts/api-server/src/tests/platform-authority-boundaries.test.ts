import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("authority registry exists and documents duplicate-prone domains", () => {
  const r = read("../../../../docs/architecture/platform-authority-registry.md");
  assert.equal(r.includes("Authority-First Build Rule"), true);
  assert.equal(r.includes("legacy") || r.includes("duplicate"), true);
  assert.equal(r.includes("Pilot Readiness"), true);
});

test("consolidated 33-35 checkpoint doc is restored and non-truncated", () => {
  const d = read("../../../../docs/checkpoints/checkpoints-33-35-enterprise-hardening-pilot-readiness.md");
  assert.equal(d.split("\n").length > 30, true);
  assert.equal(d.includes("checkpoint-33-security-hardening.md"), true);
  assert.equal(d.includes("checkpoint-34-workflow-approval-ops.md"), true);
  assert.equal(d.includes("checkpoint-35-pilot-readiness.md"), true);
});

test("key canonical modules and route guard boundary docs exist", () => {
  assert.equal(fs.existsSync(new URL("../lib/security/authorization-service.ts", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../middleware/security-guards.ts", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../lib/workflow/workflow-operations-service.ts", import.meta.url)), true);
  assert.equal(fs.existsSync(new URL("../../../../docs/security/tenant-isolation.md", import.meta.url)) || fs.existsSync(new URL("../../../../docs/checkpoints/checkpoint-33-security-hardening.md", import.meta.url)), true);
});
