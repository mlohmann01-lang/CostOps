import test from "node:test";
import assert from "node:assert/strict";
import { forecastEconomicSpend, forecastAIAdoption } from "../lib/economic-forecasting"; test("compat exports",()=>{assert.ok(forecastEconomicSpend); assert.ok(forecastAIAdoption);});
