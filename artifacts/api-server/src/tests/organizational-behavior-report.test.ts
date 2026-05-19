import test from "node:test";
import assert from "node:assert/strict";
import { organizational_behavior_report } from "../lib/organizational-behavior-curves/organizational-behavior-report"; test("organizational-behavior-report.test.ts",()=>{assert.equal(organizational_behavior_report({}).deterministicSimulation,true);});
