import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("AI governance route exposes read-only demo payload", () => {
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/playbooks.ts"), "utf8");
  assert.equal(route.includes('router.get("/ai-governance/exposure"'), true);
  assert.equal(route.includes('router.post("/ai-governance/exposure"'), false);
  assert.equal(route.includes("runAIApplicationDiscoveryPlaybook"), true);
});
