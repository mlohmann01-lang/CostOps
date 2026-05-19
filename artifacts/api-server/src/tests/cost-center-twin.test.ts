import test from "node:test";
import assert from "node:assert/strict";
import { buildCostCenterTwin } from "../lib/digital-twin-foundation/cost-center-twin";
test("cost-center-twin",()=>{const r=buildCostCenterTwin({id:"x",from:1,to:2,base:1,factor:2,assumptions:[]} as any); assert.ok(r);});
