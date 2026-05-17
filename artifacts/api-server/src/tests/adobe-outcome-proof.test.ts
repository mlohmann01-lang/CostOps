import test from "node:test"; import assert from "node:assert/strict";
function proof(before:any,after:any){ return { domain:"ADOBE", beforeState:before, afterState:after, proofType: after.licenseAssigned===false?"INACTIVE_RECLAIM":"GOVERNANCE_REVIEW", realizedSavings: Number(before.cost||0)-Number(after.cost||0) }; }
test("outcome proof maps before/after",()=>{ const p=proof({licenseAssigned:true,cost:30},{licenseAssigned:false,cost:0}); assert.equal(p.domain,"ADOBE"); assert.equal(p.proofType,"INACTIVE_RECLAIM"); });
