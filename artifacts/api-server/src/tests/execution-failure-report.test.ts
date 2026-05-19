import test from "node:test";
import assert from "node:assert/strict";
import { execution_failure_report } from "../lib/execution-failure-propagation/execution-failure-report"; test("execution-failure-report.test.ts",()=>{assert.equal(execution_failure_report({}).deterministicSimulation,true);});
