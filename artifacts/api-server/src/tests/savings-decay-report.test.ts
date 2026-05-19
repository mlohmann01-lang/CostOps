import test from "node:test";
import assert from "node:assert/strict";
import { savings_decay_report } from "../lib/savings-decay-realism/savings-decay-report"; test("savings-decay-report.test.ts",()=>{assert.equal(savings_decay_report({}).deterministicSimulation,true);});
