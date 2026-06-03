import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("renewal contract exposure API route is read-only and returns demo payload", () => {
  const route = fs.readFileSync(path.join(process.cwd(), "src/routes/playbooks.ts"), "utf8");
  assert.equal(route.includes('router.get("/renewals/exposure"'), true);
  assert.equal(route.includes('router.post("/renewals/exposure"'), false);
  assert.equal(route.includes("runRenewalContractPlaybook"), true);
  assert.equal(route.includes("renewalCalendar: result.renewalCalendar"), true);
});
