import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("executive risk API route is read-only and wired", () => {
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/index.ts"), "utf8");
  assert.equal(route.includes('router.get("/executive-risk"'), true);
  assert.equal(route.includes('router.post("/executive-risk"'), false);
  assert.equal(route.includes("buildExecutiveRiskCommandCenter"), true);
});
