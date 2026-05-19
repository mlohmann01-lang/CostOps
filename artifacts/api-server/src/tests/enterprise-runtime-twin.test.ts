import test from "node:test";
import assert from "node:assert/strict";
import { buildEnterpriseRuntimeTwin } from "../lib/digital-twin-foundation/enterprise-runtime-twin";
test("enterprise-runtime-twin",()=>{const r=buildEnterpriseRuntimeTwin({id:"x",from:1,to:2,base:1,factor:2,assumptions:[]} as any); assert.ok(r);});
