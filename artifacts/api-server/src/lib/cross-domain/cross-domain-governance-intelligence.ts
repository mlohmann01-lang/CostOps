import type { CrossDomainIdentityRecord, DomainKey, Severity } from './types';
const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));
const band=(n:number)=> n>=90?'HIGHLY_GOVERNED':n>=75?'ADVANCED':n>=55?'MATURE':n>=35?'DEVELOPING':'INITIAL';

export function detectCrossDomainIdentityExposure(records: CrossDomainIdentityRecord[]){
  const byUser = new Map<string,CrossDomainIdentityRecord[]>(); records.forEach(r=>{ const k=`${r.tenantId}:${r.canonicalUserKey}`; byUser.set(k,[...(byUser.get(k)??[]),r]); });
  const out:any[]=[];
  for (const [k,rows] of byUser){ const [tenantId,canonicalUserKey]=k.split(':'); const domainsInvolved=[...new Set(rows.map(r=>r.domain))] as DomainKey[]; const entityId=rows[0].entityId;
    const hasDisabled=rows.some(r=>r.disabled); const hasLicensed=rows.some(r=>r.licensed); const hasActive=rows.some(r=>r.active);
    const contractorAdmin=rows.some(r=>r.contractor)&&rows.some(r=>r.admin); const unknownOwnerGap=rows.filter(r=>r.unknownOwner).length>=2;
    if (hasDisabled&&hasLicensed&&hasActive) out.push({tenantId,entityId,canonicalUserKey,domainsInvolved,identityExposureType:'CROSS_DOMAIN_DISABLED_USER_EXPOSURE',severity:'CRITICAL' as Severity,trustImpact:'HIGH',governanceAction:'GOVERNANCE_REVIEW_REQUIRED',supportingEvidence:{rows},correlationId:`cross:identity:${canonicalUserKey}:disabled`,traceId:`trace:cross:identity:${canonicalUserKey}:disabled`});
    if (contractorAdmin) out.push({tenantId,entityId,canonicalUserKey,domainsInvolved,identityExposureType:'CROSS_DOMAIN_CONTRACTOR_ADMIN_EXPOSURE',severity:'HIGH' as Severity,trustImpact:'HIGH',governanceAction:'HIGH_RISK_REVIEW',supportingEvidence:{rows},correlationId:`cross:identity:${canonicalUserKey}:contractor-admin`,traceId:`trace:cross:identity:${canonicalUserKey}:contractor-admin`});
    if (unknownOwnerGap) out.push({tenantId,entityId,canonicalUserKey,domainsInvolved,identityExposureType:'CROSS_DOMAIN_OWNERSHIP_GAP',severity:'HIGH' as Severity,trustImpact:'MEDIUM',governanceAction:'NEEDS_TRUST_REVIEW',supportingEvidence:{rows},correlationId:`cross:identity:${canonicalUserKey}:owner-gap`,traceId:`trace:cross:identity:${canonicalUserKey}:owner-gap`});
  }
  return out;
}

export function computeCrossDomainPortfolioGovernance(input:{tenantId:string; domain:string; governanceMaturityScore:number; trustRisk:number; workflowRisk:number; driftRisk:number; suppressedOpportunityValue:number; realizedSavings:number; projectedRecoverableSpend:number;}[]){
  return input.map(i=>({...i, portfolioGovernanceSignal:i.governanceMaturityScore<55||i.trustRisk>60||i.workflowRisk>60?'GOVERNANCE_ATTENTION_REQUIRED':'STABLE'}));
}

export function detectCrossDomainOverlapSignals(input:{tenantId:string; domainsInvolved:DomainKey[]; entitiesInvolved:string[]; overlapFamily:string; unknownUsage?:boolean; governanceRisk:number; potentialSavingsRange:[number,number]; supportingEvidence:any;}[]){
  return input.map(i=>({tenantId:i.tenantId, overlapType:i.overlapFamily==='COLLABORATION'?'CROSS_DOMAIN_COLLABORATION_OVERLAP_REVIEW':i.overlapFamily==='DOCUMENT'?'CROSS_DOMAIN_DOCUMENT_WORKFLOW_OVERLAP_REVIEW':'CROSS_DOMAIN_MARKETPLACE_OVERLAP_REVIEW', domainsInvolved:i.domainsInvolved, entitiesInvolved:i.entitiesInvolved, confidence:i.unknownUsage?65:80, governanceRisk:i.governanceRisk, potentialSavingsRange:i.potentialSavingsRange, recommendedReviewType:'OVERLAP_REVIEW', supportingEvidence:i.supportingEvidence}));
}

export function detectCrossDomainAdminExposure(records: CrossDomainIdentityRecord[]){
  const admins = records.filter(r=>r.admin); const byUser=new Map<string,CrossDomainIdentityRecord[]>(); admins.forEach(r=>{const k=`${r.tenantId}:${r.canonicalUserKey}`;byUser.set(k,[...(byUser.get(k)??[]),r]);});
  return [...byUser.entries()].map(([k,rows])=>{const [tenantId,canonicalUserKey]=k.split(':'); const domainsWithAdminAccess=[...new Set(rows.map(r=>r.domain))]; const multi=domainsWithAdminAccess.length>1; const contractor=rows.some(r=>r.contractor); const inactive=rows.some(r=>r.inactive); const ownerGap=rows.some(r=>r.unknownOwner); const highCost=rows.some(r=>r.highCostLicense);
    const requiredReviewType = inactive?'URGENT_REVIEW':contractor?'HIGH_RISK_REVIEW':ownerGap?'NEEDS_TRUST_REVIEW':'GOVERNANCE_REVIEW_REQUIRED';
    const riskSeverity = inactive?'CRITICAL':(contractor||multi||highCost)?'HIGH':'MEDIUM';
    return {tenantId,canonicalUserKey,domainsWithAdminAccess,adminExposureLevel:multi?'MULTI_DOMAIN_ADMIN':'SINGLE_DOMAIN_ADMIN',riskSeverity,requiredReviewType,supportingEvidence:{rows}};
  });
}

export function computeCrossDomainWorkflowPressure(input:{tenantId:string; domain:DomainKey; openReviews:number; criticalReviews:number; highPriorityReviews:number; slaBreachedReviews:number; staleReviewCount:number; playbookTypes:string[]}[]){
  const tenantId=input[0]?.tenantId??'unknown'; const totalOpenGovernanceReviews=input.reduce((a,b)=>a+b.openReviews,0); const criticalReviews=input.reduce((a,b)=>a+b.criticalReviews,0); const highPriorityReviews=input.reduce((a,b)=>a+b.highPriorityReviews,0); const slaBreachedReviews=input.reduce((a,b)=>a+b.slaBreachedReviews,0); const staleReviewCount=input.reduce((a,b)=>a+b.staleReviewCount,0);
  const reviewsByDomain=Object.fromEntries(input.map(i=>[i.domain,i.openReviews])); const reviewsByPlaybookType:Record<string,number>={}; input.forEach(i=>i.playbookTypes.forEach(p=>(reviewsByPlaybookType[p]=(reviewsByPlaybookType[p]??0)+1)));
  const bottleneckDomains=input.filter(i=>i.slaBreachedReviews>0||i.openReviews>20).map(i=>i.domain); const bottleneckPlaybookTypes=Object.entries(reviewsByPlaybookType).filter(([,v]:any)=>v>=2).map(([k])=>k);
  const reviewLoad={totalOpenGovernanceReviews,criticalReviews,highPriorityReviews,slaBreachedReviews,reviewsByDomain,reviewsByPlaybookType,staleReviewCount,approvalBottleneckSignal:bottleneckDomains.length>0};
  return {tenantId,workflowPressureLevel: totalOpenGovernanceReviews>60||slaBreachedReviews>10?'CRITICAL':totalOpenGovernanceReviews>30?'HIGH':'MODERATE',reviewLoad,slaBreachCount:slaBreachedReviews,bottleneckDomains,bottleneckPlaybookTypes,recommendedOperationalFocus:bottleneckDomains.length?'Reduce backlog in bottleneck domains':'Maintain review throughput'};
}

export function computeCrossDomainGovernanceDrift(input:{tenantId:string; domainsInvolved:DomainKey[]; driftCategory:string; growthRate:number; supportingEvidence:any;}[]){
  return input.map((i,idx)=>({tenantId:i.tenantId,driftCategory:i.driftCategory,domainsInvolved:i.domainsInvolved,severity:i.growthRate>0.3?'HIGH':'MEDIUM',growthRate:i.growthRate,confidence:clamp(60+i.growthRate*40),supportingEvidence:i.supportingEvidence,correlationId:`cross:drift:${i.tenantId}:${idx}`,traceId:`trace:cross:drift:${i.tenantId}:${idx}`}));
}

export function computeCrossDomainOperationalMaturity(input:{tenantId:string;domainScores:{domain:DomainKey;score:number}[];trustMaturity:number;governanceMaturity:number;workflowMaturity:number;telemetryMaturity:number;replayMaturity:number;outcomeMaturity:number;crossDomainCorrelationMaturity:number;}){
  const domainCoverageMaturity=clamp((input.domainScores.length/3)*100); const enterpriseOperationalMaturityScore=clamp((input.trustMaturity+input.governanceMaturity+input.workflowMaturity+input.telemetryMaturity+input.replayMaturity+input.outcomeMaturity+domainCoverageMaturity+input.crossDomainCorrelationMaturity)/8);
  const sorted=[...input.domainScores].sort((a,b)=>a.score-b.score);
  return {tenantId:input.tenantId,enterpriseOperationalMaturityScore,enterpriseOperationalMaturityBand:band(enterpriseOperationalMaturityScore),domainScores:input.domainScores,weakestDomains:sorted.slice(0,1).map(x=>x.domain),strongestDomains:sorted.slice(-1).map(x=>x.domain),topGovernanceRisks:['TRUST_DEGRADATION','WORKFLOW_BACKLOG'],recommendedFocusAreas:['Governance backlog reduction','Ownership normalization']};
}
