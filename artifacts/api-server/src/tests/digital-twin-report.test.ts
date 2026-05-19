import test from "node:test";
import assert from "node:assert/strict";
import { computeDigitalTwinReport } from "../lib/digital-twin-foundation/digital-twin-report";
test("digital-twin-report",()=>{const r=computeDigitalTwinReport({id:"x",from:1,to:2,base:1,factor:2,assumptions:[]} as any); assert.ok(r);});
