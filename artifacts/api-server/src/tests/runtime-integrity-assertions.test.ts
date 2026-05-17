import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";

test("runtime integrity assertion dimensions present", ()=>{
  const s = fs.readFileSync(new URL("../lib/support-diagnostics-service.ts", import.meta.url), "utf8");
  for (const k of ["telemetryCoveragePercent","replayCoveragePercent","workflowTraceCoveragePercent","lifecycleCoveragePercent","correlationContinuityPercent","orphanOperationalObjects"]) assert.equal(s.includes(k), true);
});
