import test from "node:test"; import assert from "node:assert/strict";
import { detectAnomaly } from "../lib/security/anomaly-detection"; import { enforceExecutionGuardrail } from "../lib/security/execution-guardrails";

test("anomaly detection behavior", ()=>{ assert.equal(detectAnomaly([1,2,30]), true); });
test("execution flood blocking", ()=>{ for(let i=0;i<20;i++) enforceExecutionGuardrail('s',20); assert.throws(()=>enforceExecutionGuardrail('s',20)); });
