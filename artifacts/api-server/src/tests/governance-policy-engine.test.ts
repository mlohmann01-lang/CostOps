import test from "node:test"; import assert from "node:assert/strict";
import { GovernancePolicyEngine } from "../lib/governance/governance-policy-engine";

test("deterministic evaluation", async ()=>{ const e=new GovernancePolicyEngine(); const a=await e.evaluate('default','RECOMMENDATION','1',{user:{role:'ADMIN'}},{simulation:true}); const b=await e.evaluate('default','RECOMMENDATION','1',{user:{role:'ADMIN'}},{simulation:true}); assert.equal(a.deterministicHash,b.deterministicHash); });
