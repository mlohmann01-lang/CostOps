import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const read = (p: string) => fs.readFileSync(new URL(p, import.meta.url), "utf8");

test("telemetry authority doc defines canonical path", () => {
  const doc = read("../../../../docs/architecture/telemetry-authority.md");
  assert.equal(doc.includes("operational-telemetry-service.ts"), true);
});
