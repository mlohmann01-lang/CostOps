import test from "node:test"; import assert from "node:assert/strict";
function summarize(statuses:string[]){return {actionable:statuses.filter(s=>s==="READY_FOR_REVIEW").length,suppressed:statuses.filter(s=>s==="SUPPRESSED").length,needsEvidence:statuses.filter(s=>s==="NEEDS_EVIDENCE").length};}
test("suppressed excluded from actionable",()=>{ const s=summarize(["READY_FOR_REVIEW","SUPPRESSED","NEEDS_EVIDENCE"]); assert.equal(s.actionable,1); assert.equal(s.suppressed,1); });
