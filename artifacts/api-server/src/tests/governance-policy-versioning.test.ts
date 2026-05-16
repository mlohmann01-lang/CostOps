import test from "node:test"; import assert from "node:assert/strict";
import { GovernancePolicyEngine } from "../lib/governance/governance-policy-engine";

test("immutable versioning creates new version after active", async ()=>{ const e=new GovernancePolicyEngine(); const p1:any=await e.createPolicy({tenantId:'default',policyKey:'k1',policyName:'P1',policyStatus:'ACTIVE',policyDefinition:{conditions:[],outcome:'ALLOW'}},'u'); const p2:any=await e.createPolicy({tenantId:'default',policyKey:'k1',policyName:'P1b',policyStatus:'DRAFT',policyDefinition:{conditions:[],outcome:'WARN'}},'u'); assert.notEqual(p1.policyVersion,p2.policyVersion); });
