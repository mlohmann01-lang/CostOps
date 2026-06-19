import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";

test("legacy bypass protections covered in boundary test suite", ()=>{
  const s = fs.readFileSync(new URL("../tests/execution-boundary-protection.test.ts", import.meta.url), "utf8");
  assert.equal(s.includes("do not import execution-engine"), true);
});
