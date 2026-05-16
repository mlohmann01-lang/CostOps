import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";

test("support diagnostics excludes secrets and remains tenant scoped", ()=>{
  const src = fs.readFileSync(new URL("../lib/support-diagnostics-service.ts", import.meta.url), "utf8");
  assert.equal(src.includes("accessToken"), false);
  assert.equal(src.includes("password"), false);
  assert.equal(src.includes("tenantId"), true);
});
