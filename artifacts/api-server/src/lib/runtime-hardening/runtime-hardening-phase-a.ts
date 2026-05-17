const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));

export function hardenIdentityReconciliation(input:{tenantId:string; identityConfidence:number; duplicateEmail?:boolean; missingEmail?:boolean; sharedAccount?:boolean; crossDomainMismatch?:boolean; lineageConfidence:number; ownershipConfidence:number;}){
  const identityConflictType = input.duplicateEmail?'IDENTITY_COLLISION':input.missingEmail?'MISSING_EMAIL':input.sharedAccount?'SHARED_ACCOUNT_AMBIGUITY':input.crossDomainMismatch?'CROSS_DOMAIN_MISMATCH':'NONE';
  const reconciliationConflictReason = identityConflictType==='CROSS_DOMAIN_MISMATCH'?'RECONCILIATION_CONFLICT':identityConflictType==='IDENTITY_COLLISION'?'QUARANTINED':'NONE';
  const governanceAction = identityConflictType==='IDENTITY_COLLISION'?'QUARANTINED':input.sharedAccount?'GOVERNANCE_REVIEW_REQUIRED':input.identityConfidence<0.5?'NEEDS_TRUST_REVIEW':'NONE';
  return {identityConfidence:input.identityConfidence,identityConflictType,lineageConfidence:input.lineageConfidence,ownershipConfidence:input.ownershipConfidence,crossDomainMismatch:Boolean(input.crossDomainMismatch),reconciliationConflictReason,governanceAction};
}

export function modelTrustDegradation(input:{staleEvidence:number;staleTelemetry:number;missingOwnership:number;workflowAbandonment:number;simulationDrift:number;outcomeReversal:number;identityDegradation:number;connectorDegradation:number;reconciliationInstability:number;}){
  const trustDegradationRate=clamp(input.staleEvidence*8+input.staleTelemetry*8+input.missingOwnership*10+input.workflowAbandonment*8+input.simulationDrift*12+input.outcomeReversal*12+input.identityDegradation*12+input.connectorDegradation*10+input.reconciliationInstability*10);
  return {trustDegradationRate,trustDecayReason:trustDegradationRate>70?'HIGH_DEGRADATION':'MODERATE_DEGRADATION',connectorHealthImpact:clamp(input.connectorDegradation*20),workflowImpact:clamp(input.workflowAbandonment*20),simulationConfidenceImpact:clamp(input.simulationDrift*25),outcomeConfidenceImpact:clamp(input.outcomeReversal*25),suppressRecommendations:trustDegradationRate>80,staleTelemetryDowngrade:input.staleTelemetry>3,staleOwnershipGovernanceReview:input.missingOwnership>2};
}

export function computeWorkflowBacklogSurvivability(input:{slaBreaches:number;backlogGrowth:number;staleApprovals:number;staleExceptions:number;reviewAbandonment:number;workflowConcentrationRisk:number;operatorOverload:number;}){
  const governanceLoadIndex=clamp(input.slaBreaches*4+input.backlogGrowth*3+input.staleApprovals*3+input.staleExceptions*2+input.reviewAbandonment*4+input.workflowConcentrationRisk*10+input.operatorOverload*10);
  return {workflowPressureTrend:input.backlogGrowth>10?'RISING':'STABLE',slaRiskLevel:input.slaBreaches>8?'CRITICAL':'ELEVATED',reviewAbandonmentRisk:clamp(input.reviewAbandonment*15),operatorConcentrationRisk:clamp(input.workflowConcentrationRisk*100),governanceLoadIndex};
}

export function computeReplayDurability(input:{longLivedRecommendations:number;staleTelemetry:number;partialEvidenceLoss:number;workflowEscalationChains:number;driftEvolution:number;trustDegradation:number;simulationRecalibration:number;outcomeReversals:number;}){
  const replayIntegrityScore=clamp(100-(input.staleTelemetry*5+input.partialEvidenceLoss*10+input.workflowEscalationChains*4+input.outcomeReversals*6+input.trustDegradation*4));
  return {replayIntegrityScore,replayConfidence:clamp(replayIntegrityScore-input.driftEvolution*5),replayGapDetected:input.partialEvidenceLoss>0,replayLineageCompleteness:clamp(100-input.partialEvidenceLoss*20),replayConflictDetected:input.outcomeReversals>2,replayWarning:input.partialEvidenceLoss>0,replayDegraded:input.partialEvidenceLoss>3};
}

export function computeTelemetryPressure(input:{eventVolume:number;partialEventLoss:number;delayedTelemetry:number;duplicateTelemetry:number;crossDomainBursts:number;replayBacklog:number;orderingInstability:number;}){
  const telemetryGapRate=clamp((input.partialEventLoss/Math.max(input.eventVolume,1))*100);
  return {telemetryPressureLevel:input.eventVolume>10000||input.replayBacklog>100?'HIGH':'MODERATE',telemetryGapRate,telemetryOrderingRisk:clamp(input.orderingInstability*15),telemetryReplayLag:input.replayBacklog,eventContinuityConfidence:clamp(100-telemetryGapRate-input.delayedTelemetry*2-input.duplicateTelemetry),replayConfidenceDowngrade:telemetryGapRate>20,telemetryDegradationSignal:input.orderingInstability>3};
}

export function computeGovernanceDriftRealism(input:{slowTrustDecay:number;slowOwnershipDecay:number;slowWorkflowBacklogAccumulation:number;slowAdminConcentrationGrowth:number;slowMarketplaceSprawlGrowth:number;slowWorkspaceEntropyGrowth:number;slowSuppressionGrowth:number;}){
  const driftVelocity=clamp((input.slowTrustDecay+input.slowOwnershipDecay+input.slowWorkflowBacklogAccumulation+input.slowAdminConcentrationGrowth+input.slowMarketplaceSprawlGrowth+input.slowWorkspaceEntropyGrowth+input.slowSuppressionGrowth)/7*100);
  return {driftVelocity,driftPersistence:clamp(driftVelocity*0.8),entropyAcceleration:clamp((input.slowMarketplaceSprawlGrowth+input.slowWorkspaceEntropyGrowth)*50),suppressionAcceleration:clamp(input.slowSuppressionGrowth*100),governanceDecayTrend:driftVelocity>60?'ACCELERATING':'GRADUAL'};
}

export function computeOutcomeRealismHardening(input:{realizationRate:number;reversalRate:number;partialRealizationRate:number;outcomeAgeDays:number;falsePositiveRate:number;staleRecommendationRate:number;}){
  const realizationReliability=clamp(input.realizationRate*100-input.falsePositiveRate*40-input.staleRecommendationRate*30);
  const reversalLikelihood=clamp(input.reversalRate*100);
  return {realizationReliability,reversalLikelihood,partialRealizationConfidence:clamp(input.partialRealizationRate*100),outcomeAgingImpact:clamp(input.outcomeAgeDays/3),calibrationStability:clamp(realizationReliability-reversalLikelihood*0.4),confidenceDowngrade:reversalLikelihood>50,outcomeAgingPenalty:input.outcomeAgeDays>180};
}

export function computeRuntimeIntegrityDiagnostics(input:{tenantId:string;affectedDomains:string[];}){
  const mk=(diagnosticCategory:string,runtimeArea:string,severity:string)=>({diagnosticCategory,severity,runtimeArea,affectedDomains:input.affectedDomains,recommendedOperationalAction:'REVIEW_RUNTIME_SIGNAL',correlationId:`diag:${input.tenantId}:${diagnosticCategory}`,traceId:`trace:diag:${input.tenantId}:${diagnosticCategory}`});
  return [mk('REPLAY_INTEGRITY_DIAGNOSTICS','REPLAY','MEDIUM'),mk('WORKFLOW_SURVIVABILITY_DIAGNOSTICS','WORKFLOW','HIGH'),mk('TRUST_DEGRADATION_DIAGNOSTICS','TRUST','HIGH'),mk('TELEMETRY_CONTINUITY_DIAGNOSTICS','TELEMETRY','MEDIUM'),mk('CROSS_DOMAIN_RECONCILIATION_DIAGNOSTICS','RECONCILIATION','HIGH'),mk('SIMULATION_STABILITY_DIAGNOSTICS','SIMULATION','MEDIUM'),mk('OUTCOME_CALIBRATION_DIAGNOSTICS','OUTCOME','MEDIUM')];
}

export function simulateOperationalChaos(input:{chaosScenario:string;severity:number;}){
  return {chaosScenario:input.chaosScenario,runtimeImpact:input.severity>70?'SEVERE_DEGRADATION':'CONTROLLED_DEGRADATION',affectedAuthorities:['OperationalTelemetryService','WorkflowOperationsService','EvidenceReconciliationService','PolicySimulationService'],degradationSeverity:input.severity>70?'HIGH':'MEDIUM',recoveryConfidence:clamp(100-input.severity)};
}

export function computeProductionAppendOnlyIntegrity(input:{domains:Array<{domain:string;snapshots:number;mutationsDetected:number;latestPointerUpdated:boolean;deterministicHash:boolean}>}){
  const mutatedDomains=input.domains.filter((d)=>d.mutationsDetected>0).map((d)=>d.domain);
  const missingSnapshots=input.domains.filter((d)=>d.snapshots<1).map((d)=>d.domain);
  return {appendOnlyIntegrity:mutatedDomains.length===0&&missingSnapshots.length===0,mutatedDomains,missingSnapshots,latestPointerCompliance:input.domains.every((d)=>d.latestPointerUpdated),deterministicHashContinuity:input.domains.every((d)=>d.deterministicHash)};
}

export function computeProductionReplayStorageDurability(input:{historyTypes:Record<string,boolean>;oldestTraceAt:string|null;newestTraceAt:string|null;hashValid:number;hashMismatches:number;}){
  const missingHistoryTypes=Object.entries(input.historyTypes).filter(([,v])=>!v).map(([k])=>k);
  const historyDepth=Object.values(input.historyTypes).filter(Boolean).length;
  const hashContinuityStatus=input.hashMismatches>0?'MISMATCH':input.hashValid===0?'INCOMPLETE':missingHistoryTypes.length>0?'PARTIAL':'VALID';
  return {durableReplayReady:missingHistoryTypes.length===0&&hashContinuityStatus==='VALID',missingHistoryTypes,oldestTraceAt:input.oldestTraceAt,newestTraceAt:input.newestTraceAt,historyDepth,hashContinuityStatus};
}

export function computeProductionTelemetryContinuity(input:{retentionCoverageStatus:'FULL'|'PARTIAL'|'INSUFFICIENT';lateEventCount:number;duplicateEventCount:number;missingRequiredEventCount:number;eventOrderingInstability:number;tenantTelemetryContinuity:boolean;}){
  return {...input,eventOrderingRisk:input.eventOrderingInstability>5?'HIGH':input.eventOrderingInstability>2?'MEDIUM':'LOW'};
}

export function computeProductionWorkflowAccumulation(input:{backlogAges:number[];staleWorkflowCount:number;unresolvedCriticalCount:number;reassignmentChainDepth:number;historyComplete:boolean;tenantWorkflowIsolationStatus:'ISOLATED'|'LEAK_RISK';}){
  const max=Math.max(...input.backlogAges,0);
  return {backlogAgeDistribution:{p50:input.backlogAges.sort((a,b)=>a-b)[Math.floor(input.backlogAges.length/2)]??0,max},staleWorkflowCount:input.staleWorkflowCount,unresolvedCriticalCount:input.unresolvedCriticalCount,reassignmentChainRisk:input.reassignmentChainDepth>4?'HIGH':'LOW',workflowHistoryCompleteness:input.historyComplete,tenantWorkflowIsolationStatus:input.tenantWorkflowIsolationStatus};
}

export function computeProductionReconciliationPersistence(input:{activeFindingCount:number;resolvedFindingCount:number;suppressedFindingCount:number;criticalBlockerCount:number;historicalBlockerPreserved:boolean;findingReplayContinuity:boolean;}){ return input; }

export function computeProductionGraphScaleGuardrails(input:{entityCount:number;edgeCount:number;duplicateClusterCount:number;orphanClusterCount:number;lowConfidenceCorrelationRate:number;graphFreshnessMinutes:number;tenantGraphIsolationStatus:'ISOLATED'|'CROSS_TENANT_RISK';}){ return {...input,graphFreshnessStatus:input.graphFreshnessMinutes<60?'FRESH':'STALE'}; }

export function computeProductionTenantPersistenceIsolation(input:{domains:Array<{domain:string;tenantIdPresent:boolean;lineageTenantConsistent:boolean}>}){
  const violations=input.domains.filter((d)=>!d.tenantIdPresent||!d.lineageTenantConsistent).map((d)=>d.domain);
  return {tenantPersistenceIsolation:violations.length===0,crossTenantHistoryLeakageDetected:violations.length>0,missingTenantIdDomains:input.domains.filter((d)=>!d.tenantIdPresent).map((d)=>d.domain),tenantMismatchDomains:input.domains.filter((d)=>!d.lineageTenantConsistent).map((d)=>d.domain)};
}

export function computeProductionRuntimeDiagnostics(input:{persistenceIntegrityHealth:string;replayDurabilityHealth:string;telemetryRetentionHealth:string;workflowAccumulationHealth:string;reconciliationPersistenceHealth:string;graphScaleHealth:string;tenantIsolationHealth:string;outcomeCalibrationHealth:string;simulationReliabilityHealth:string;}){
  const critical=[input.persistenceIntegrityHealth,input.replayDurabilityHealth,input.tenantIsolationHealth].every((v)=>v==='HEALTHY');
  return {...input,productionRuntimeReadiness:critical?'READY':'HARDENING_REQUIRED'};
}

export function computeHistoricalLineageIntegrity(input:{links:Record<string,boolean>;brokenCorrelationLinks:string[];hashContinuity:'VALID'|'PARTIAL'|'MISMATCH';tenantConsistency:boolean;replayReady:boolean;}){
  const missingLineageLinks=Object.entries(input.links).filter(([,v])=>!v).map(([k])=>k);
  return {lineageCompleteness:missingLineageLinks.length===0,missingLineageLinks,brokenCorrelationLinks:input.brokenCorrelationLinks,hashContinuity:input.hashContinuity,tenantConsistency:input.tenantConsistency,replayReady:input.replayReady};
}

export function computeProductionRuntimeReadinessGuards(input:{executionExpansionDetected:boolean;subsystemForkDetected:boolean;appendOnlyPreserved:boolean;tenantIsolationPreserved:boolean;telemetryContinuityPreserved:boolean;replayDurabilityPreserved:boolean;workflowDurabilityPreserved:boolean;graphIsolationPreserved:boolean;lineageIntegrityPreserved:boolean;}){
  return {guardsPassed:!input.executionExpansionDetected&&!input.subsystemForkDetected&&input.appendOnlyPreserved&&input.tenantIsolationPreserved&&input.telemetryContinuityPreserved&&input.replayDurabilityPreserved&&input.workflowDurabilityPreserved&&input.graphIsolationPreserved&&input.lineageIntegrityPreserved,...input};
}
