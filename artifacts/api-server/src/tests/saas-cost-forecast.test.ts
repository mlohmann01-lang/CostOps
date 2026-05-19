import test from "node:test";
import assert from "node:assert/strict";
import { forecastSaaSCost } from "../lib/economic-forecasting/saas-cost-forecast";
test("saas-cost-forecast",()=>{const r=forecastSaaSCost({base:100,growthRate:0.1,periods:3,assumptions:["a"],evidenceConfidence:0.8,attributionConfidence:0.7} as any); assert.ok(r);});
