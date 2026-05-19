import test from "node:test";
import assert from "node:assert/strict";
import { forecastCloudCost } from "../lib/economic-forecasting/cloud-cost-forecast";
test("cloud-cost-forecast",()=>{const r=forecastCloudCost({base:100,growthRate:0.1,periods:3,assumptions:["a"],evidenceConfidence:0.8,attributionConfidence:0.7} as any); assert.ok(r);});
