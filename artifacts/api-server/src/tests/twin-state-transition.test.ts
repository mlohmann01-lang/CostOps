import test from "node:test";
import assert from "node:assert/strict";
import { evaluateTwinStateTransition } from "../lib/digital-twin-foundation/twin-state-transition";
test("twin-state-transition",()=>{const r=evaluateTwinStateTransition({id:"x",from:1,to:2,base:1,factor:2,assumptions:[]} as any); assert.ok(r);});
