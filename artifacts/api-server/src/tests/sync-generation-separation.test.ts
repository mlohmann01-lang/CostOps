import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("recommendations route does not import ingestion", () => {
  const src = readFileSync(new URL("../routes/recommendations.ts", import.meta.url), "utf8");
  assert.equal(src.includes("ingestM365Tenant"), false);
});
