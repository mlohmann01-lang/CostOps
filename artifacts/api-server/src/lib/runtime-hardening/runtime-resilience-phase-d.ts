const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));

const severity=(v:number)=>v>=85?'CRITICAL':v>=65?'HIGH_RISK':v>=35?'DEGRADED':'STABLE';

export function simulateTelemetryDelayRecovery(input:{delayedEventVolume:number;averageDelayMinutes:number;burstRecoveryMultiplier:number;retentionWindowHours:number;orderingViolationRate:number;tenantCount:number;}){
  const backlogPressure=clamp((input.delayedEventVolume/Math.max(input.tenantCount,1))/2000*50+Math.max(0,input.burstRecoveryMultiplier-1)*35);
  const orderingIntegrityRisk=clamp(input.orderingViolationRate*100+Math.max(0,input.averageDelayMinutes-30)/10);
  const projectedRecoveryTime=Math.round((input.delayedEventVolume/Math.max(input.tenantCount,1))*Math.max(1,input.averageDelayMinutes/15)/Math.max(input.burstRecoveryMultiplier,1));
  const replaySynchronizationRisk=clamp(backlogPressure*0.6+orderingIntegrityRisk*0.4+Math.max(0,24-input.retentionWindowHours));
  const continuityRisk=clamp(backlogPressure*0.5+orderingIntegrityRisk*0.3+replaySynchronizationRisk*0.2);
  return {projectedRecoveryTime,continuityRisk,orderingIntegrityRisk,backlogPressure,replaySynchronizationRisk,telemetryRecoveryClassification:severity(continuityRisk)};
}

export function simulateReplayCorruptionPressure(input:{replayWindowCount:number;corruptionRate:number;lineageMismatchRate:number;replayGapRate:number;validationFailureRate:number;}){
  const replayIntegrityRisk=clamp(input.corruptionRate*40+input.lineageMismatchRate*25+input.replayGapRate*20+input.validationFailureRate*15+Math.min(input.replayWindowCount,500)/10);
  const corruptionSpreadRisk=clamp(input.corruptionRate*100+input.replayGapRate*60);
  const deterministicRecoveryLikelihood=clamp(100-(input.lineageMismatchRate*40+input.validationFailureRate*35+input.replayGapRate*25));
  return {replayIntegrityRisk,corruptionSpreadRisk,deterministicRecoveryLikelihood,replayContinuityClassification:severity(replayIntegrityRisk),requiredAuditCadence:replayIntegrityRisk>=65?'DAILY':replayIntegrityRisk>=35?'WEEKLY':'MONTHLY'};
}

export function simulateWorkflowRecoveryPressure(input:{activeWorkflowCount:number;blockedWorkflowCount:number;averageApprovalDelay:number;escalationRate:number;reconciliationDependencyRate:number;}){
  const blockedRatio=input.blockedWorkflowCount/Math.max(input.activeWorkflowCount,1);
  const congestionSeverity=clamp(blockedRatio*60+input.averageApprovalDelay*0.8+input.escalationRate*40);
  const workflowSurvivabilityRisk=clamp(congestionSeverity*0.6+input.reconciliationDependencyRate*40);
  const governanceBacklogRisk=clamp(blockedRatio*70+input.averageApprovalDelay*0.6);
  return {congestionSeverity,workflowSurvivabilityRisk,governanceBacklogRisk,SLARecoveryProjection:Math.round(input.averageApprovalDelay*(1+blockedRatio)*Math.max(1,1+input.escalationRate)),operationalContinuityClassification:severity(workflowSurvivabilityRisk)};
}

export function simulateCrossDomainDriftAmplification(input:{domainMismatchRate:number;staleConnectorRate:number;orphanedEntityRate:number;reconciliationConflictRate:number;trustScoreDecayRate:number;}){
  const driftAmplificationRisk=clamp(input.domainMismatchRate*25+input.staleConnectorRate*20+input.orphanedEntityRate*20+input.reconciliationConflictRate*20+input.trustScoreDecayRate*15);
  return {driftAmplificationRisk,crossDomainIntegrityRisk:clamp(driftAmplificationRisk*0.8+input.reconciliationConflictRate*20),governanceConfidenceDegradation:clamp(driftAmplificationRisk*0.7+input.trustScoreDecayRate*30),trustContinuityRisk:clamp(input.trustScoreDecayRate*100+input.staleConnectorRate*40),operationalReadinessImpact:severity(driftAmplificationRisk)};
}

export function simulateTenantIsolationPressure(input:{tenantCount:number;concurrentTenantOperations:number;sharedDependencyPressure:number;graphOverlapRisk:number;lineageCrossReferenceRisk:number;}){
  const concurrencyPerTenant=input.concurrentTenantOperations/Math.max(input.tenantCount,1);
  const tenantIsolationRisk=clamp(concurrencyPerTenant*2+input.sharedDependencyPressure*30+input.graphOverlapRisk*35+input.lineageCrossReferenceRisk*35);
  return {tenantIsolationRisk,blastRadiusProjection:clamp(tenantIsolationRisk*0.75+input.sharedDependencyPressure*25),lineageContainmentRisk:clamp(input.lineageCrossReferenceRisk*100+input.graphOverlapRisk*30),governanceBoundaryRisk:clamp(tenantIsolationRisk*0.85+input.graphOverlapRisk*15),isolationReadinessClassification:severity(tenantIsolationRisk)};
}

export function simulateStorageFragmentationRecovery(input:{retentionYears:number;archiveVolumeGB:number;fragmentationRate:number;replayRecoveryLoad:number;lineageLookupPressure:number;}){
  const storageFragmentationRisk=clamp(input.fragmentationRate*50+Math.min(input.retentionYears,10)*4+input.archiveVolumeGB/1000*20);
  return {storageFragmentationRisk,replayRecoveryLatencyRisk:clamp(storageFragmentationRisk*0.6+input.replayRecoveryLoad*40),archiveRecoveryPressure:clamp(input.archiveVolumeGB/5000*70+input.replayRecoveryLoad*30),historicalLookupDegradation:clamp(storageFragmentationRisk*0.5+input.lineageLookupPressure*50),storageRecoveryClassification:severity(storageFragmentationRisk)};
}

export function evaluateRuntimeResilienceThresholds(input:Record<'telemetry'|'replay'|'workflow'|'graph'|'lineage'|'tenant-isolation'|'drift'|'storage'|'reconciliation',number>){
  return Object.entries(input).map(([category,v])=>({category,severity:severity(v),readinessImpact:v>=65?'HIGH':v>=35?'MEDIUM':'LOW',operationalRisk:v,recoveryUrgency:v>=85?'IMMEDIATE':v>=65?'PRIORITY':v>=35?'SCHEDULED':'MONITOR',blockingStatus:v>=65}));
}

export function computeEnterpriseRuntimeResilienceReport(input:{thresholds:ReturnType<typeof evaluateRuntimeResilienceThresholds>;telemetryContinuityStatus:string;replayContinuityStatus:string;lineageIntegrityStatus:string;workflowSurvivabilityStatus:string;isolationStatus:string;governanceDeterminismStatus:string;}){
  const blocked=input.thresholds.filter((x)=>x.blockingStatus);
  const highestRiskAreas=[...input.thresholds].sort((a,b)=>b.operationalRisk-a.operationalRisk).slice(0,3).map((x)=>x.category);
  const hasCritical=input.thresholds.some((x)=>x.severity==='CRITICAL');
  const hasHigh=blocked.length>0;
  const overallStatus=hasCritical?'NOT_READY':hasHigh?'RECOVERY_RISK_PRESENT':input.thresholds.some((x)=>x.severity==='DEGRADED')?'HARDENING_REQUIRED':'OPERATIONALLY_READY';
  return {...input,overallStatus,highestRiskAreas,recoveryConfidence:Math.max(0,100-input.thresholds.reduce((a,b)=>a+b.operationalRisk,0)/input.thresholds.length),recommendedHardeningPriorities:highestRiskAreas};
}
