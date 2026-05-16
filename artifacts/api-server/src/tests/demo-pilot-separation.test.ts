import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";

test("demo reset blocked for non-demo tenant and production has no demo mode", ()=>{
  const reset = fs.readFileSync(new URL("../../../scripts/reset-golden-demo.ts", import.meta.url), "utf8");
  const seed = fs.readFileSync(new URL("../../../scripts/seed-golden-demo.ts", import.meta.url), "utf8");
  const provision = fs.readFileSync(new URL("../lib/tenant-provisioning-service.ts", import.meta.url), "utf8");
  assert.equal(reset.includes("Blocked reset: non-demo tenant"), true);
  assert.equal(seed.includes("Refusing to reset non-demo tenant"), true);
  assert.equal(provision.includes('demoMode: "false"'), true);
});
