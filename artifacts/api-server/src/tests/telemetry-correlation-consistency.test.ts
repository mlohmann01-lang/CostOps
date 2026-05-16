import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("playbook recommendation service includes correlationId generation", () => {
  const src = read("../lib/playbooks/playbook-recommendation-service.ts");
  assert.equal(src.includes("correlationId"), true);
});
