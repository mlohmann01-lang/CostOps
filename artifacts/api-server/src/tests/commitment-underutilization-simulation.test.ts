import test from "node:test";
import assert from "node:assert/strict";
import { simulateCommitmentUnderutilization } from "../lib/governance-scenario-simulation/commitment-underutilization-simulation";
test("commitment-underutilization-simulation",()=>{const r=simulateCommitmentUnderutilization({base:10,factor:2,assumptions:["a"]} as any); assert.ok(r);});
