import test from "node:test";
import assert from "node:assert/strict";
import { buildWorkloadTwin } from "../lib/digital-twin-foundation/workload-twin";
test("workload-twin",()=>{const r=buildWorkloadTwin({id:"x",from:1,to:2,base:1,factor:2,assumptions:[]} as any); assert.ok(r);});
