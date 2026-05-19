import test from "node:test";
import assert from "node:assert/strict";
import { seasonality_report } from "../lib/seasonality-business-cycle/seasonality-report"; test("seasonality-report.test.ts",()=>{assert.equal(seasonality_report({}).deterministicSimulation,true);});
