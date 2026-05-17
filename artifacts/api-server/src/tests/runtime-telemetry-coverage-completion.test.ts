import test from "node:test"; import assert from "node:assert/strict";
import { REQUIRED_M365_RUNTIME_EVENTS, computeTelemetryCoverage } from "../lib/observability/operational-telemetry-service";

test("telemetry coverage helper detects missing runtime events", ()=>{
  const seeded = REQUIRED_M365_RUNTIME_EVENTS.slice(0, 5).map((eventType)=>({eventType, correlationId:"c", eventMetadata:{traceId:"t"}}));
  const out = computeTelemetryCoverage(seeded as any);
  assert.equal(out.missingEvents.length > 0, true);
  assert.equal(out.coveragePercent < 100, true);
});
