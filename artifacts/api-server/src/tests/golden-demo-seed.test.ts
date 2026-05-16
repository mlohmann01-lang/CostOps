import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

test("golden demo seed script is deterministic and contains required scenarios", () => {
  const p = path.resolve(process.cwd(), "../scripts/seed-golden-demo.ts");
  const src = fs.readFileSync(p, "utf8");
  assert.equal(src.includes('const seededAt = new Date("2026-04-30T09:00:00.000Z")'), true);
  for (const scenario of ["SCENARIO_A", "SCENARIO_B", "SCENARIO_C", "SCENARIO_D", "SCENARIO_E"]) {
    assert.equal(src.includes(scenario), true);
  }
  assert.equal(src.includes("projectedMonthlySavings: 18400"), true);
  assert.equal(src.includes("realizedMonthlySavings: 15900"), true);
});

test("workspace package has golden demo seed and reset scripts", () => {
  const pkgPath = path.resolve(process.cwd(), "../package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  assert.equal(typeof pkg.scripts["seed:golden-demo"], "string");
  assert.equal(typeof pkg.scripts["reset:golden-demo"], "string");
});
