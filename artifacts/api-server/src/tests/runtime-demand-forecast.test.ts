import test from "node:test";
import assert from "node:assert/strict";
import { forecastRuntimeDemand } from "../lib/economic-forecasting/runtime-demand-forecast";
test("runtime-demand-forecast",()=>{const r=forecastRuntimeDemand({base:100,growthRate:0.1,periods:3,assumptions:["a"],evidenceConfidence:0.8,attributionConfidence:0.7} as any); assert.ok(r);});
