import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("non-execution routes do not import execution-engine", () => {
  for (const route of ["../routes/recommendations.ts","../routes/workflow.ts","../routes/simulations.ts","../routes/governance.ts","../routes/outcomes.ts"]) {
    assert.equal(read(route).includes("execution-engine"), false);
  }
});
