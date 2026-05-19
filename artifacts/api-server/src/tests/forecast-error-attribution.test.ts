import test from "node:test";
import assert from "node:assert/strict";
import { evaluateForecastErrorAttribution } from "../lib/forecast-calibration/forecast-error-attribution"; test("forecast-error-attribution.test.ts",()=>{assert.ok(evaluateForecastErrorAttribution({workload:1,pricing:2,approvalDelay:0.1,recurrence:0.2,missingEvidence:0.3,baseConfidence:0.9,missCount:1,assumptionDelta:0.2,expectedDays:10,actualDays:20} as any));});
