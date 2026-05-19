import test from "node:test";
import assert from "node:assert/strict";
import { forecastWorkloadGrowth } from "../lib/economic-forecasting/workload-growth-forecast";
test("workload-growth-forecast",()=>{const r=forecastWorkloadGrowth({base:100,growthRate:0.1,periods:3,assumptions:["a"],evidenceConfidence:0.8,attributionConfidence:0.7} as any); assert.ok(r);});
