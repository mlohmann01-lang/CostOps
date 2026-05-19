import test from "node:test";
import assert from "node:assert/strict";
import { forecastSnowflakeCost } from "../lib/economic-forecasting/snowflake-cost-forecast";
test("snowflake-cost-forecast",()=>{const r=forecastSnowflakeCost({base:100,growthRate:0.1,periods:3,assumptions:["a"],evidenceConfidence:0.8,attributionConfidence:0.7} as any); assert.ok(r);});
