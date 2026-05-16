import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("key routes do not fallback to default tenant", () => {
  for (const route of ["../routes/recommendations.ts","../routes/workflow.ts","../routes/simulations.ts","../routes/telemetry.ts"]) {
    assert.equal(read(route).includes('"default"'), false);
  }
});
