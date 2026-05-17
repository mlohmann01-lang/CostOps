import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAtlassianReconciliationFindings } from '../lib/atlassian/atlassian-reconciliation-runtime';
import { REQUIRED_ATLASSIAN_RUNTIME_EVENTS } from '../lib/observability/operational-telemetry-service';

const base:any={tenantId:'t1',domain:'ATLASSIAN',siteId:'s1',user:{email:'a@b.com',managedAccount:true,contractorFlag:false,productType:'JIRA',adminRole:null,groupMemberships:[],marketplaceAssignments:['x']},usageSignal:{lastActivityAt:null,usageConfidence:'UNKNOWN_USAGE_CONFIDENCE'},entitlement:{entitlementSource:'SCIM',entitlementConfidence:0.9},identity:{identityConfidence:0.9,duplicateIdentity:false,sharedMailbox:false},recommendationContext:{unknownActivity:true,unknownOwner:false,unknownGroupState:false,unknownSiteMapping:false,unknownUsageConfidence:true,unknownEntitlementSource:false,owner:'KNOWN'}};

test('phase b atlassian runtime assertions',()=>{
 const findings=buildAtlassianReconciliationFindings({...base,marketplaceOverlap:true,marketplaceOwnerUnknown:true,permissionTopologyConflict:true,workspaceEntropyHigh:true,highRiskPermissionCluster:true} as any);
 const types=findings.map(f=>f.findingType);
 assert.equal(types.includes('ATLASSIAN_MARKETPLACE_OVERLAP'),true);
 assert.equal(types.includes('ATLASSIAN_MARKETPLACE_OWNER_UNKNOWN'),true);
 assert.equal(types.includes('ATLASSIAN_PERMISSION_TOPOLOGY_CONFLICT'),true);
 assert.equal(types.includes('ATLASSIAN_WORKSPACE_ENTROPY_HIGH'),true);
 assert.equal(types.includes('ATLASSIAN_HIGH_RISK_PERMISSION_CLUSTER'),true);
 assert.equal(REQUIRED_ATLASSIAN_RUNTIME_EVENTS.includes('ATLASSIAN_GOVERNANCE_DRIFT_DETECTED' as any),true);
});
