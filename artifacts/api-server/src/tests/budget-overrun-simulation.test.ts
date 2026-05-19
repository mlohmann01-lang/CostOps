import test from "node:test";
import assert from "node:assert/strict";
import { simulateBudgetOverrun } from "../lib/governance-scenario-simulation/budget-overrun-simulation";
test("budget-overrun-simulation",()=>{const r=simulateBudgetOverrun({base:10,factor:2,assumptions:["a"]} as any); assert.ok(r);});
