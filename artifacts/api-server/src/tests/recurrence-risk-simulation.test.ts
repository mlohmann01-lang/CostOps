import test from "node:test";
import assert from "node:assert/strict";
import { simulateRecurrenceRisk } from "../lib/governance-scenario-simulation/recurrence-risk-simulation";
test("recurrence-risk-simulation",()=>{const r=simulateRecurrenceRisk({base:10,factor:2,assumptions:["a"]} as any); assert.ok(r);});
