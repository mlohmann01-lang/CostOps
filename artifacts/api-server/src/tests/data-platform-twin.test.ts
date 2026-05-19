import test from "node:test";
import assert from "node:assert/strict";
import { buildDataPlatformTwin } from "../lib/digital-twin-foundation/data-platform-twin";
test("data-platform-twin",()=>{const r=buildDataPlatformTwin({id:"x",from:1,to:2,base:1,factor:2,assumptions:[]} as any); assert.ok(r);});
