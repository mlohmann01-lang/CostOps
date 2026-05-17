import type { AtlassianNormalizedEvidence } from './types';
export type AtlassianFinding={tenantId:string;entityId:string;findingType:string;severity:'INFO'|'WARNING'|'BLOCKER'|'CRITICAL_BLOCKER';trustImpact:'NONE'|'LOW'|'MEDIUM'|'HIGH';requiresReview:boolean;blocksRecommendation:boolean;suppressionBehavior:'NONE'|'NEEDS_EVIDENCE'|'NEEDS_TRUST_REVIEW'|'GOVERNANCE_REVIEW_REQUIRED'|'SUPPRESS';evidence:Record<string,unknown>;correlationId:string;traceId:string;createdAt:string};
export function buildAtlassianReconciliationFindings(e:AtlassianNormalizedEvidence & { inactiveDays?:number; licensed?:boolean; contractorState?:string; siteMembershipConflict?:boolean; marketplaceUsageKnown?:boolean; groupAmbiguity?:boolean; }){
 const now=new Date().toISOString(); const cid=`atlassian:recon:${e.user.email}`; const tid=`trace:${e.user.email}`; const f:AtlassianFinding[]=[];
 const push=(findingType:string,severity:AtlassianFinding['severity'],suppressionBehavior:AtlassianFinding['suppressionBehavior'],evidence:Record<string,unknown>,blocks=false)=>f.push({tenantId:e.tenantId,entityId:e.user.email,findingType,severity,trustImpact:severity==='CRITICAL_BLOCKER'?'HIGH':severity==='BLOCKER'?'MEDIUM':'LOW',requiresReview:suppressionBehavior!=='NONE',blocksRecommendation:blocks,suppressionBehavior,evidence,correlationId:cid,traceId:tid,createdAt:now});
 if (e.identity.duplicateIdentity) push('ATLASSIAN_DUPLICATE_IDENTITY','BLOCKER','NEEDS_TRUST_REVIEW',{duplicateIdentity:true},true);
 if ((e.inactiveDays??0)>90 && e.licensed) push('ATLASSIAN_INACTIVE_LICENSED_USER','WARNING','NONE',{inactiveDays:e.inactiveDays});
 if (e.user.contractorFlag && e.contractorState==='INACTIVE' && e.licensed) push('ATLASSIAN_CONTRACTOR_DRIFT','BLOCKER','GOVERNANCE_REVIEW_REQUIRED',{contractorState:e.contractorState},true);
 if ((e.user.adminRole??'').length>0) push('ATLASSIAN_ADMIN_ROLE_EXCLUSION','CRITICAL_BLOCKER','SUPPRESS',{adminRole:e.user.adminRole},true);
 if (e.groupAmbiguity || e.recommendationContext.unknownGroupState) push('ATLASSIAN_GROUP_ASSIGNMENT_AMBIGUITY','WARNING','NEEDS_EVIDENCE',{groups:e.user.groupMemberships});
 if (e.siteMembershipConflict || e.recommendationContext.unknownSiteMapping) push('ATLASSIAN_SITE_MEMBERSHIP_CONFLICT','BLOCKER','GOVERNANCE_REVIEW_REQUIRED',{siteId:e.siteId},true);
 if (!e.marketplaceUsageKnown && e.user.marketplaceAssignments.length>0) push('ATLASSIAN_MARKETPLACE_ASSIGNMENT_UNKNOWN','WARNING','NEEDS_EVIDENCE',{marketplaceAssignments:e.user.marketplaceAssignments});
 if (e.recommendationContext.unknownOwner) push('ATLASSIAN_UNKNOWN_COST_OWNER','BLOCKER','GOVERNANCE_REVIEW_REQUIRED',{owner:e.recommendationContext.owner},true);
 if (e.usageSignal.usageConfidence==='UNKNOWN_USAGE_CONFIDENCE') push('ATLASSIAN_USAGE_EVIDENCE_MISSING','WARNING','NEEDS_EVIDENCE',{usageConfidence:e.usageSignal.usageConfidence});

 if ((e as any).marketplaceOverlap) push('ATLASSIAN_MARKETPLACE_OVERLAP','WARNING','GOVERNANCE_REVIEW_REQUIRED',{marketplaceOverlap:true});
 if ((e as any).marketplaceOwnerUnknown) push('ATLASSIAN_MARKETPLACE_OWNER_UNKNOWN','BLOCKER','GOVERNANCE_REVIEW_REQUIRED',{owner:'UNKNOWN'},true);
 if ((e as any).marketplaceUsageUnknown) push('ATLASSIAN_MARKETPLACE_USAGE_UNKNOWN','WARNING','NEEDS_EVIDENCE',{usage:'UNKNOWN'});
 if ((e as any).marketplaceAdminRisk) push('ATLASSIAN_MARKETPLACE_ADMIN_RISK','BLOCKER','GOVERNANCE_REVIEW_REQUIRED',{adminRisk:true},true);
 if ((e as any).workspaceEntropyHigh) push('ATLASSIAN_WORKSPACE_ENTROPY_HIGH','WARNING','GOVERNANCE_REVIEW_REQUIRED',{workspaceEntropy:'HIGH'});
 if ((e as any).permissionTopologyConflict) push('ATLASSIAN_PERMISSION_TOPOLOGY_CONFLICT','BLOCKER','GOVERNANCE_REVIEW_REQUIRED',{topologyConflict:true},true);
 if ((e as any).adminChainRedundancy) push('ATLASSIAN_ADMIN_CHAIN_REDUNDANCY','WARNING','GOVERNANCE_REVIEW_REQUIRED',{adminChainRedundancy:true});
 if ((e as any).groupInheritanceOverlap) push('ATLASSIAN_GROUP_INHERITANCE_OVERLAP','WARNING','NEEDS_EVIDENCE',{groupInheritanceOverlap:true});
 if ((e as any).highRiskPermissionCluster) push('ATLASSIAN_HIGH_RISK_PERMISSION_CLUSTER','CRITICAL_BLOCKER','GOVERNANCE_REVIEW_REQUIRED',{highRiskPermissionCluster:true},true);
 return f;
}
