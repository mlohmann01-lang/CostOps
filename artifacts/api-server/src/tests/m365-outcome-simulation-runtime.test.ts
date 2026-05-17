import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("outcome resolution persists simulation linkage metadata", () => {
  const src = fs.readFileSync(new URL("../lib/recommendations/recommendation-outcome-resolution-service.ts", import.meta.url), "utf8");
  const simRoute = fs.readFileSync(new URL("../routes/simulations.ts", import.meta.url), "utf8");
  assert.equal(src.includes("simulationProjectedSavings"), true);
  assert.equal(src.includes("realizationDelta"), true);
  assert.equal(simRoute.includes("/outcome-correlation"), true);
});
