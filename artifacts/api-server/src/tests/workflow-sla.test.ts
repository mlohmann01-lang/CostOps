import test from "node:test";
import assert from "node:assert/strict";
import { WorkflowOperationsService } from "../lib/workflow/workflow-operations-service";

const svc = new WorkflowOperationsService();

test("SLA HEALTHY", ()=>{
  const created = new Date("2026-01-01T00:00:00Z");
  const due = new Date("2026-01-02T00:00:00Z");
  const now = new Date("2026-01-01T06:00:00Z");
  assert.equal(svc.calcSlaStatus(created, due, now), "HEALTHY");
});

test("SLA WARNING", ()=>{
  const created = new Date("2026-01-01T00:00:00Z");
  const due = new Date("2026-01-02T00:00:00Z");
  const now = new Date("2026-01-01T19:00:00Z");
  assert.equal(svc.calcSlaStatus(created, due, now), "WARNING");
});

test("SLA BREACHED", ()=>{
  const created = new Date("2026-01-01T00:00:00Z");
  const due = new Date("2026-01-02T00:00:00Z");
  const now = new Date("2026-01-02T01:00:00Z");
  assert.equal(svc.calcSlaStatus(created, due, now), "BREACHED");
});
