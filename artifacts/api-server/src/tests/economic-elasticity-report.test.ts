import test from "node:test";
import assert from "node:assert/strict";
import { computeEconomicElasticityReport } from "../lib/economic-elasticity-realism/economic-elasticity-report"; test("elasticity report",()=>{assert.equal(computeEconomicElasticityReport({base:10,growth:0.2}).realism,true);});
