import test from "node:test"; import assert from "node:assert/strict";
import { toM365RecommendationCandidate } from "../lib/decision-intelligence/m365-expansion-pack-1.js";
import { disabledLicensedUserReclaimPlaybook } from "../lib/playbooks/m365-multi-playbooks.js";
test("m365 candidate integration emits canonical candidate with metadata",()=>{ const c=toM365RecommendationCandidate("t1", disabledLicensedUserReclaimPlaybook as any, {email:"u@c.com",displayName:"U",sku:"E3",cost:10,days:100}); assert.equal(c.domain,"m365"); assert.ok(c.playbookPriority!=null); assert.ok(c.replayCorrelationId); assert.equal(typeof c.idempotencyKey,"string"); assert.equal((c as any).executionPayload, undefined);});
