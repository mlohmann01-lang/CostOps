import test from "node:test";
import assert from "node:assert/strict";
import { buildAIRuntimeTwin } from "../lib/digital-twin-foundation/ai-runtime-twin";
test("ai-runtime-twin",()=>{const r=buildAIRuntimeTwin({id:"x",from:1,to:2,base:1,factor:2,assumptions:[]} as any); assert.ok(r);});
