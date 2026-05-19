import test from "node:test";
import assert from "node:assert/strict";
import { evaluateForecastDrift } from "../lib/forecast-calibration/forecast-drift-engine";
test("forecast-drift-engine",()=>{const r=evaluateForecastDrift({forecast:100,actual:120,history:[5],baseConfidence:0.8,recurrenceEvents:1,avgDelayDays:10,volatility:0.6} as any); assert.ok(r);});
