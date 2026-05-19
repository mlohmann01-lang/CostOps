import test from "node:test";
import assert from "node:assert/strict";
import { computeGovernanceScenarioReport } from "../lib/governance-scenario-simulation/governance-scenario-report";
test("governance-scenario-report",()=>{const r=computeGovernanceScenarioReport({base:10,factor:2,assumptions:["a"]} as any); assert.ok(r);});
