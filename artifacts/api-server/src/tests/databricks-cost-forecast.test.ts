import test from "node:test";
import assert from "node:assert/strict";
import { forecastDatabricksCost } from "../lib/economic-forecasting/databricks-cost-forecast";
test("databricks-cost-forecast",()=>{const r=forecastDatabricksCost({base:100,growthRate:0.1,periods:3,assumptions:["a"],evidenceConfidence:0.8,attributionConfidence:0.7} as any); assert.ok(r);});
