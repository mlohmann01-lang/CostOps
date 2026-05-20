import test from "node:test";import assert from "node:assert/strict";import * as m from "../lib/replay-calibration/replay-confidence-adjustment";
test("replay-confidence-adjustment",()=>{assert.equal(Object.values(m).length>0,true);});
