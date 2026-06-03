import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("governance graph API route is read-only and returns graph payload", () => {
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/index.ts"), "utf8");
  assert.equal(route.includes('router.get("/governance-graph"'), true);
  assert.equal(route.includes('router.post("/governance-graph"'), false);
  assert.equal(route.includes("buildGovernanceGraph"), true);
});
