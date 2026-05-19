import test from "node:test";
import assert from "node:assert/strict";
import { evaluateForecastRealizationLag } from "../lib/forecast-calibration/forecast-realization-lag"; test("forecast-realization-lag.test.ts",()=>{assert.ok(evaluateForecastRealizationLag({workload:1,pricing:2,approvalDelay:0.1,recurrence:0.2,missingEvidence:0.3,baseConfidence:0.9,missCount:1,assumptionDelta:0.2,expectedDays:10,actualDays:20} as any));});
