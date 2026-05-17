import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
test("adobe telemetry events catalog present", ()=>{ const c=fs.readFileSync(new URL("../lib/observability/operational-telemetry-service.ts", import.meta.url),"utf8"); assert.equal(c.includes("REQUIRED_ADOBE_RUNTIME_EVENTS"), true); assert.equal(c.includes("emitAdobeEvent"), true); });
