import test from "node:test";
import assert from "node:assert/strict";
import { forecastAIRuntimeCost } from "../lib/economic-forecasting/ai-runtime-cost-forecast";
test("ai-runtime-cost-forecast",()=>{const r=forecastAIRuntimeCost({base:100,growthRate:0.1,periods:3,assumptions:["a"],evidenceConfidence:0.8,attributionConfidence:0.7} as any); assert.ok(r);});
