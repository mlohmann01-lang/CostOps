import test from "node:test";
import assert from "node:assert/strict";
import { forecastBudgetVariance } from "../lib/economic-forecasting/budget-variance-forecast";
test("budget-variance-forecast",()=>{const r=forecastBudgetVariance({forecast:120,budget:100,assumptions:["a"]} as any); assert.ok(r);});
