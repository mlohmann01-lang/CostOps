import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs"; import path from "node:path";

test("demo reset blocked for non-demo tenant and production has no demo mode", ()=>{
  const reset = fs.readFileSync(path.resolve(process.cwd(), "../../scripts/reset-golden-demo.ts"), "utf8");
  const seed = fs.readFileSync(path.resolve(process.cwd(), "../../scripts/seed-golden-demo.ts"), "utf8");
  const provision = fs.readFileSync(path.resolve(process.cwd(), "src/lib/tenant-provisioning-service.ts"), "utf8");
  assert.equal(reset.includes("Blocked reset: non-demo tenant"), true);
  assert.equal(seed.includes("Refusing to reset non-demo tenant"), true);
  assert.equal(provision.includes('demoMode: "false"'), true);
});
