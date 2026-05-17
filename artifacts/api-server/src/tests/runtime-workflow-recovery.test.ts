import test from "node:test"; import assert from "node:assert/strict"; import fs from "node:fs";
test("workflow recovery methods present", ()=>{ const s=fs.readFileSync(new URL("../lib/workflow/workflow-operations-service.ts", import.meta.url),"utf8"); assert.equal(s.includes("evaluateSlaBreaches"), true); assert.equal(s.includes("WORKFLOW_SLA_BREACHED"), true); });
