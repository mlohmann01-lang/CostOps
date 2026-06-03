import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("shadow IT exposure API route is read-only and wired to demo playbook payload", () => {
  const routes = fs.readFileSync(path.join(process.cwd(), "src/routes/playbooks.ts"), "utf8");
  assert.equal(routes.includes('router.get("/shadow-it/exposure"'), true);
  assert.equal(routes.includes("runShadowITDiscoveryPlaybook(demoShadowITDiscoveryInput)"), true);
  assert.equal(routes.includes("summary: result.dashboardTile"), true);
  assert.equal(routes.includes("evidenceRefs"), true);
  assert.equal(routes.includes('router.post("/shadow-it/exposure"'), false);
});
