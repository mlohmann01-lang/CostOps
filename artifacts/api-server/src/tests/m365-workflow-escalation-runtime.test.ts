import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("workflow escalation history runtime endpoint and telemetry exist", () => {
  const svc = fs.readFileSync(new URL("../lib/workflow/workflow-operations-service.ts", import.meta.url), "utf8");
  const route = fs.readFileSync(new URL("../routes/workflow.ts", import.meta.url), "utf8");
  assert.equal(svc.includes("getEscalationHistory"), true);
  assert.equal(route.includes("/escalation-history"), true);
  assert.equal(svc.includes("M365_WORKFLOW_ESCALATED"), true);
});
