import test from "node:test";
import assert from "node:assert/strict";
import { computeForecastCalibrationReport } from "../lib/forecast-calibration/forecast-calibration-report";
test("forecast-calibration-report",()=>{const r=computeForecastCalibrationReport({forecast:100,actual:120,history:[5],baseConfidence:0.8,recurrenceEvents:1,avgDelayDays:10,volatility:0.6} as any); assert.ok(r);});
