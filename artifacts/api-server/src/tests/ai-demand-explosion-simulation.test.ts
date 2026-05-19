import test from "node:test";
import assert from "node:assert/strict";
import { simulateAIDemandExplosion } from "../lib/governance-scenario-simulation/ai-demand-explosion-simulation";
test("ai-demand-explosion-simulation",()=>{const r=simulateAIDemandExplosion({base:10,factor:2,assumptions:["a"]} as any); assert.ok(r);});
