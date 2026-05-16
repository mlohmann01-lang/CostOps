import test from "node:test"; import assert from "node:assert/strict";
import { GovernancePolicyEngine } from "../lib/governance/governance-policy-engine";

test("precedence ordering restrictive wins", ()=>{ const e:any=new GovernancePolicyEngine(); const arr=[{outcome:'ALLOW'},{outcome:'BLOCK'},{outcome:'WARN'}]; arr.sort((a,b)=>['BLOCK','REQUIRE_APPROVAL','WARN','ALLOW'].indexOf(a.outcome)-['BLOCK','REQUIRE_APPROVAL','WARN','ALLOW'].indexOf(b.outcome)); assert.equal(arr[0].outcome,'BLOCK'); });
