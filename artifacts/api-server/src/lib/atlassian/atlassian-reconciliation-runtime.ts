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
 return f;
}
