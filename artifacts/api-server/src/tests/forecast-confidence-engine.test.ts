import test from "node:test";
import assert from "node:assert/strict";
import { evaluateForecastConfidence } from "../lib/economic-forecasting/forecast-confidence-engine";
test("forecast-confidence-engine",()=>{const r=evaluateForecastConfidence({evidenceConfidence:0.8,attributionConfidence:0.7,assumptions:["a"]} as any); assert.ok(r);});
