import test from "node:test"; import assert from "node:assert/strict";
import { GovernancePolicyEngine } from "../lib/governance/governance-policy-engine";

test("replay-safe reconstruction hash stable", async ()=>{ const e=new GovernancePolicyEngine(); const out=await e.evaluate('default','RECOMMENDATION','abc',{x:1},{simulation:true}); const out2=await e.evaluate('default','RECOMMENDATION','abc',{x:1},{simulation:true}); assert.equal(out.deterministicHash,out2.deterministicHash); assert.equal(out.simulationCompatible,true);});
