import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveRepoPath } from "./test-harness-paths";

test("golden demo contains drift and reversal scenarios", () => {
  const p = resolveRepoPath("scripts", "seed-golden-demo.ts");
  const src = readFileSync(p, "utf8");
  assert.equal(src.includes('outcome === "DRIFTED"'), true);
  assert.equal(src.includes('outcome === "REVERSED"'), true);
});

test("golden demo writes append-only outcome history", () => {
  const p = resolveRepoPath("scripts", "seed-golden-demo.ts");
  const src = readFileSync(p, "utf8");
  assert.equal(src.includes("const history ="), true);
  assert.equal(src.includes('"PENDING", "REALIZED", "DRIFTED"'), true);
  assert.equal(src.includes('"PENDING", "REALIZED", "REVERSED"'), true);
  assert.equal(src.includes("appendOnly: true"), true);
});
