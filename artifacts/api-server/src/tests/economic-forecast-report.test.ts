import test from "node:test";
import assert from "node:assert/strict";
import { computeEconomicForecastReport } from "../lib/economic-forecasting/economic-forecast-report";
test("economic-forecast-report",()=>{const r=computeEconomicForecastReport({base:100,growthRate:0.1,periods:3,assumptions:["a"],evidenceConfidence:0.8,attributionConfidence:0.7} as any); assert.ok(r);});
