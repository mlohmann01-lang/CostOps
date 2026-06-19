import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("disabled-user vertical slice route is wired", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/routes/connectors.ts"), "utf8");
  assert.equal(src.includes("/m365/reclaim/disabled-users/run"), true);
  assert.equal(src.includes("M365DisabledUserReclaimSliceService"), true);
});

test("economic operations route reads persisted M365 reclaim data", () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), "src/routes/economic-operations.ts"), "utf8");
  assert.equal(src.includes("M365 Disabled Licensed User Reclaim"), true);
  assert.equal(src.includes("m365-exec-"), true);
  const registrySrc = fs.readFileSync(path.resolve(process.cwd(), "src/lib/connectors/m365/m365-economic-operations-registry.ts"), "utf8");
  assert.equal(registrySrc.includes("m365-disabled-licensed-user-reclaim"), true);
});
