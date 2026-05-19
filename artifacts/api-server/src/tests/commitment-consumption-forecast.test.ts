import test from "node:test";
import assert from "node:assert/strict";
import { forecastCommitmentConsumption } from "../lib/economic-forecasting/commitment-consumption-forecast";
test("commitment-consumption-forecast",()=>{const r=forecastCommitmentConsumption({base:100,growthRate:0.1,periods:3,assumptions:["a"],evidenceConfidence:0.8,attributionConfidence:0.7} as any); assert.ok(r);});
