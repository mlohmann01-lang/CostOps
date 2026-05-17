import test from "node:test"; import assert from "node:assert/strict";
import { computeTelemetryCoverage } from "../lib/observability/operational-telemetry-service";

test("correlation continuity detection flags missing ids", ()=>{
  const out = computeTelemetryCoverage([{eventType:"X", correlationId:null, eventMetadata:{}}] as any);
  assert.equal(out.missingCorrelationCount, 1);
  assert.equal(out.missingTraceCount, 1);
});
