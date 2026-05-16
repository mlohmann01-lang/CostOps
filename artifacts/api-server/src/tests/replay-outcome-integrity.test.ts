import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

test("deterministic hash is stable and detects mutation", () => {
  const payload = { a: 1, b: "x" };
  const h1 = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const h2 = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const h3 = createHash("sha256").update(JSON.stringify({ ...payload, b: "y" })).digest("hex");
  assert.equal(h1, h2);
  assert.notEqual(h1, h3);
});
