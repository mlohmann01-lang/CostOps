import test from "node:test"; import assert from "node:assert/strict"; import { WorkflowOperationsService } from "../lib/workflow/workflow-operations-service";
test("sla status breach deterministic", ()=>{ const svc=new WorkflowOperationsService(); const st=svc.calcSlaStatus(new Date("2026-01-01"), new Date("2026-01-02"), new Date("2026-01-03")); assert.equal(st,"BREACHED"); });
