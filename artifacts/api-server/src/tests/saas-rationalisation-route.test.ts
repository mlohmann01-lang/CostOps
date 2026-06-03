import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("SaaS rationalisation exposure API route is read-only and returns demo payload", () => {
  const routes = fs.readFileSync(path.join(process.cwd(), "src/routes/playbooks.ts"), "utf8");
  assert.equal(routes.includes('router.get("/saas-rationalisation/exposure"'), true);
  assert.equal(routes.includes("runSaaSRationalisationPlaybook(demoSaaSRationalisationInput)"), true);
  assert.equal(routes.includes("opportunity: result.opportunity"), true);
  assert.equal(routes.includes('router.post("/saas-rationalisation/exposure"'), false);
});
