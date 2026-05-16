import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";

test("tenant provisioning baseline and default pilot profile are defined", ()=>{
  const src = fs.readFileSync(new URL("../lib/tenant-provisioning-service.ts", import.meta.url), "utf8");
  assert.equal(src.includes("TENANT_PROVISIONED"), true);
  assert.equal(src.includes("pilotProfilesTable"), true);
  assert.equal(src.includes("default-approval-policy"), true);
});
