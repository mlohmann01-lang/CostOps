import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("ownership intelligence API route is read-only and returns demo payload", () => {
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/playbooks.ts"), "utf8");
  assert.equal(route.includes('router.get("/ownership/exposure"'), true);
  assert.equal(route.includes('router.post("/ownership/exposure"'), false);
  assert.equal(route.includes("runOwnershipIntelligencePlaybook"), true);
  assert.equal(route.includes("accountabilityRiskScore: result.accountabilityRiskScore"), true);
});
