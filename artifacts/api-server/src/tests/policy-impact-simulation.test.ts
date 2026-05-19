import test from "node:test";
import assert from "node:assert/strict";
import { simulatePolicyImpact } from "../lib/governance-scenario-simulation/policy-impact-simulation";
test("policy-impact-simulation",()=>{const r=simulatePolicyImpact({base:10,factor:2,assumptions:["a"]} as any); assert.ok(r);});
