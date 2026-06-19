import test from "node:test"; import assert from "node:assert/strict";
// canonical-runtime-context.ts exports only a TypeScript interface (CanonicalRuntimeContext),
// which is erased at compile time and produces no runtime exports. A "module has exports"
// check is the wrong assertion for a type-only contract file; verify the type-only shape instead.
test("canonical-runtime-context",()=>{ const src = require("node:fs").readFileSync(require("node:path").resolve(process.cwd(), "src/lib/canonical-runtime-orchestration/canonical-runtime-context.ts"), "utf8"); assert.equal(src.includes("interface CanonicalRuntimeContext"), true); });