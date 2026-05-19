import test from "node:test";
import assert from "node:assert/strict";
import { snapshotTwinState } from "../lib/digital-twin-foundation/twin-state-snapshot";
test("twin-state-snapshot",()=>{const r=snapshotTwinState({id:"x",from:1,to:2,base:1,factor:2,assumptions:[]} as any); assert.ok(r);});
