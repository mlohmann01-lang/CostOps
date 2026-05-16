import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("recommendation route requires tenant context and avoids default fallback", () => {
  const src = read("../routes/recommendations.ts");
  assert.equal(src.includes("router.use(requireTenantContext())"), true);
  assert.equal(src.includes('"default"'), false);
});
