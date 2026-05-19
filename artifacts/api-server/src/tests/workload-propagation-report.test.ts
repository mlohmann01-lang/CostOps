import test from "node:test";
import assert from "node:assert/strict";
import { workload_propagation_report } from "../lib/workload-propagation-realism/workload-propagation-report"; test("workload-propagation-report.test.ts",()=>{assert.equal(workload_propagation_report({} as any).deterministicForecast,true);});
