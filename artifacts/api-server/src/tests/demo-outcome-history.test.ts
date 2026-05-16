import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("golden demo contains drift and reversal scenarios", () => {
  const p = path.resolve(process.cwd(), "../scripts/seed-golden-demo.ts");
  const src = fs.readFileSync(p, "utf8");
  assert.equal(src.includes('outcome === "DRIFTED"'), true);
  assert.equal(src.includes('outcome === "REVERSED"'), true);
});

test("golden demo writes append-only outcome history", () => {
  const p = path.resolve(process.cwd(), "../scripts/seed-golden-demo.ts");
  const src = fs.readFileSync(p, "utf8");
  assert.equal(src.includes("const history ="), true);
  assert.equal(src.includes('"PENDING", "REALIZED", "DRIFTED"'), true);
  assert.equal(src.includes('"PENDING", "REALIZED", "REVERSED"'), true);
  assert.equal(src.includes("appendOnly: true"), true);
});
