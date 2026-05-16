import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("tenant guard rejects missing tenant context", () => {
  const src = read("../middleware/security-guards.ts");
  assert.equal(src.includes("TENANT_CONTEXT_REQUIRED"), true);
});
