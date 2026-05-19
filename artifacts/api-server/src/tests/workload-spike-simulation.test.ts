import test from "node:test";
import assert from "node:assert/strict";
import { simulateWorkloadSpike } from "../lib/governance-scenario-simulation/workload-spike-simulation";
test("workload-spike-simulation",()=>{const r=simulateWorkloadSpike({base:10,factor:2,assumptions:["a"]} as any); assert.ok(r);});
