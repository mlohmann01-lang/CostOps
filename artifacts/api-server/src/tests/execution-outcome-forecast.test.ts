import test from "node:test";
import assert from "node:assert/strict";
import { forecastExecutionOutcome } from "../lib/governance-scenario-simulation/execution-outcome-forecast";
test("execution-outcome-forecast",()=>{const r=forecastExecutionOutcome({base:10,factor:2,assumptions:["a"]} as any); assert.ok(r);});
