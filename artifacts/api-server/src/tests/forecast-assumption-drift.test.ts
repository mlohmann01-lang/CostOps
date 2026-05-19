import test from "node:test";
import assert from "node:assert/strict";
import { evaluateForecastAssumptionDrift } from "../lib/forecast-calibration/forecast-assumption-drift"; test("forecast-assumption-drift.test.ts",()=>{assert.ok(evaluateForecastAssumptionDrift({workload:1,pricing:2,approvalDelay:0.1,recurrence:0.2,missingEvidence:0.3,baseConfidence:0.9,missCount:1,assumptionDelta:0.2,expectedDays:10,actualDays:20} as any));});
