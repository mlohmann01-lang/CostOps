const clamp=(n:number,min=0,max=100)=>Math.max(min,Math.min(max,n));

const risk3=(v:number)=>v>70?'HIGH':v>40?'MEDIUM':'LOW';

export function simulateTelemetryThroughput(input:{tenantCount:number;eventsPerTenantPerDay:number;durationDays:number;duplicateRate:number;lateArrivalRate:number;missingEventRate:number;orderingInstabilityRate:number;burstMultiplier:number;}){
  const averageDailyEvents=input.tenantCount*input.eventsPerTenantPerDay;
  const totalProjectedEvents=averageDailyEvents*input.durationDays;
  const peakBurstEvents=Math.round(averageDailyEvents*Math.max(input.burstMultiplier,1));
  const replayLagPressure=clamp(input.missingEventRate*50+Math.max(0,input.burstMultiplier-1)*25+input.lateArrivalRate*35);
  return {
    totalProjectedEvents,averageDailyEvents,peakBurstEvents,
    telemetryContinuityRisk:risk3(clamp(input.missingEventRate*100*3+input.orderingInstabilityRate*100*1.5+input.lateArrivalRate*100*1.5)),
    retentionPressureLevel:risk3(clamp((totalProjectedEvents/10_000_000)*100)),
    orderingRisk:risk3(clamp(input.orderingInstabilityRate*100)),
    replayLagRisk:risk3(replayLagPressure),
    recommendedRetentionWindowDays:input.missingEventRate>0.1?120:90
  };
}

export function simulateReplayGrowth(input:{recommendationsPerTenantPerDay:number;averageTransitionsPerRecommendation:number;averageTelemetryEventsPerRecommendation:number;averageWorkflowEventsPerRecommendation:number;durationDays:number;tenantCount:number;missingLineageRate?:number;}){
  const recs=input.recommendationsPerTenantPerDay*input.tenantCount*input.durationDays;
  const projectedTraceRecords=Math.round(recs*(input.averageTransitionsPerRecommendation+input.averageTelemetryEventsPerRecommendation+input.averageWorkflowEventsPerRecommendation));
  const projectedReplayRecords=recs+projectedTraceRecords;
  const projectedValidationLoad=Math.round(projectedTraceRecords*0.35);
  const lineage=input.missingLineageRate??0;
  return {projectedReplayRecords,projectedTraceRecords,projectedValidationLoad,
    replayStoragePressure:risk3(clamp(projectedReplayRecords/5_000_000*100)),
    hashValidationPressure:risk3(clamp(projectedValidationLoad/2_000_000*100)),
    historyDepthRisk:risk3(clamp((input.averageTransitionsPerRecommendation+input.averageTelemetryEventsPerRecommendation+input.averageWorkflowEventsPerRecommendation)*7)),
    replayDegradationRisk:risk3(clamp(lineage*100*1.5+(projectedValidationLoad/2_000_000)*40))
  };
}

export function simulateWorkflowAccumulationPressure(input:{newReviewsPerDay:number;approvalCapacityPerDay:number;averageSlaDays:number;criticalReviewRate:number;highPriorityReviewRate:number;abandonmentRate:number;durationDays:number;tenantCount:number;}){
  const dailyNet=Math.max(0,input.newReviewsPerDay-input.approvalCapacityPerDay);
  const projectedOpenBacklog=dailyNet*input.durationDays*input.tenantCount;
  const projectedSlaBreaches=Math.round(projectedOpenBacklog*Math.min(1,input.averageSlaDays/30)*0.3);
  const projectedCriticalBreaches=Math.round(projectedSlaBreaches*input.criticalReviewRate);
  const governanceLoadIndex=clamp((projectedOpenBacklog/10000)*40+input.criticalReviewRate*25+input.highPriorityReviewRate*20+input.abandonmentRate*15);
  return {projectedOpenBacklog,projectedSlaBreaches,projectedCriticalBreaches,
    approvalBottleneckRisk:risk3(clamp(dailyNet/Math.max(input.approvalCapacityPerDay,1)*100)),
    operatorOverloadRisk:risk3(governanceLoadIndex),governanceLoadIndex,
    recommendedReviewCapacity:Math.ceil(input.newReviewsPerDay*1.15)
  };
}

export function simulateGraphGrowthPressure(input:{entitiesPerTenant:number;edgesPerEntity:number;duplicateClusterRate:number;orphanClusterRate:number;lowConfidenceCorrelationRate:number;staleSnapshotRate:number;tenantCount:number;}){
  const projectedEntityCount=input.entitiesPerTenant*input.tenantCount;
  const projectedEdgeCount=Math.round(projectedEntityCount*input.edgesPerEntity);
  return {projectedEntityCount,projectedEdgeCount,
    graphScalePressure:risk3(clamp(projectedEdgeCount/10_000_000*100+projectedEntityCount/2_000_000*100)),
    correlationReliabilityRisk:risk3(clamp(input.lowConfidenceCorrelationRate*100)),
    orphanRisk:risk3(clamp(input.orphanClusterRate*100)),
    duplicateRisk:risk3(clamp(input.duplicateClusterRate*100)),
    graphFreshnessRisk:risk3(clamp(input.staleSnapshotRate*100)),
    tenantGraphIsolationRisk:risk3(clamp((input.duplicateClusterRate+input.orphanClusterRate)*50))
  };
}

export function simulateLineageGrowthPressure(input:{averageLineageLinksPerRecommendation:number;recommendationsPerTenantPerDay:number;lineageBreakRate:number;correlationBreakRate:number;hashMismatchRate:number;durationDays:number;tenantCount:number;}){
  const recs=input.recommendationsPerTenantPerDay*input.durationDays*input.tenantCount;
  const projectedLineageLinks=Math.round(recs*input.averageLineageLinksPerRecommendation);
  return {projectedLineageLinks,
    lineageCompletenessRisk:risk3(clamp(input.lineageBreakRate*100)),
    correlationContinuityRisk:risk3(clamp(input.correlationBreakRate*100)),
    hashContinuityRisk:risk3(clamp(input.hashMismatchRate*100)),
    replayReadinessRisk:risk3(clamp(input.lineageBreakRate*100*1.5+input.hashMismatchRate*100*1.5)),
    recommendedLineageAuditCadenceDays:input.hashMismatchRate>0.08?7:input.lineageBreakRate>0.12?14:30
  };
}

export function simulateStorageRetentionGrowth(input:{telemetryRecordBytes:number;traceRecordBytes:number;workflowRecordBytes:number;outcomeRecordBytes:number;simulationRecordBytes:number;recordsPerTenantPerDay:number;tenantCount:number;retentionDays:number;}){
  const bytesPerRecord=input.telemetryRecordBytes+input.traceRecordBytes+input.workflowRecordBytes+input.outcomeRecordBytes+input.simulationRecordBytes;
  const projectedStorageBytes=bytesPerRecord*input.recordsPerTenantPerDay*input.tenantCount*input.retentionDays;
  const projectedStorageGb=projectedStorageBytes/(1024**3);
  const retentionPressureLevel=risk3(clamp(projectedStorageGb/500*100));
  return {projectedStorageBytes,projectedStorageGb,retentionPressureLevel,
    archiveRequired:projectedStorageGb>500,
    recommendedArchiveAfterDays:projectedStorageGb>500?90:180,
    hotStorageWindowDays:input.retentionDays<90?60:90
  };
}

export function simulateLongLivedTenantHistory(input:{tenantAgeDays:number;historicalRecommendationCount:number;historicalWorkflowCount:number;historicalOutcomeCount:number;historicalTelemetryCount:number;historicalReplayGapRate:number;historicalDriftRate:number;}){
  const historyVolume=input.historicalRecommendationCount+input.historicalWorkflowCount+input.historicalOutcomeCount+input.historicalTelemetryCount;
  const ageFactor=clamp(input.tenantAgeDays/3650*100);
  const completeness=clamp(100-(input.historicalReplayGapRate*60+input.historicalDriftRate*30));
  return {tenantHistoryMaturity:input.tenantAgeDays>730?'LONG_LIVED':'EMERGING',historicalReplayRisk:risk3(clamp(input.historicalReplayGapRate*100+ageFactor*0.2)),historicalDriftRisk:risk3(clamp(input.historicalDriftRate*100+ageFactor*0.2)),historyCompletenessScore:completeness,longLivedTenantRisk:risk3(clamp((100-completeness)*0.7+ageFactor*0.3+historyVolume/1_000_000*20)),recommendedHistoryMaintenanceAction:input.historicalReplayGapRate>0.1?'PRIORITIZE_REPLAY_AUDIT':input.historicalDriftRate>0.1?'PRIORITIZE_DRIFT_RECALIBRATION':'MAINTAIN_STANDARD_CADENCE'};
}

export function simulateMultiDomainOperationalLoad(input:{domains:string[];recommendationsByDomain:Record<string,number>;workflowsByDomain:Record<string,number>;telemetryByDomain:Record<string,number>;replayRecordsByDomain:Record<string,number>;driftSignalsByDomain:Record<string,number>;crossDomainSignalsPerDay:number;}){
  const loadByDomain:Object = {};
  let totalOperationalLoad=0;
  for(const d of input.domains){
    const load=(input.recommendationsByDomain[d]??0)+(input.workflowsByDomain[d]??0)+(input.telemetryByDomain[d]??0)+(input.replayRecordsByDomain[d]??0)+(input.driftSignalsByDomain[d]??0)*5;
    (loadByDomain as Record<string,number>)[d]=load; totalOperationalLoad+=load;
  }
  const entries=Object.entries(loadByDomain as Record<string,number>);
  const highestPressureDomain=entries.sort((a,b)=>b[1]-a[1])[0]?.[0]??null;
  const max=entries[0]?.[1]??0; const min=entries[entries.length-1]?.[1]??0;
  const domainImbalanceRisk=risk3(clamp(max===0?0:((max-min)/max)*100));
  const crossDomainAmplificationRisk=risk3(clamp((input.crossDomainSignalsPerDay/Math.max(entries.length,1))*10));
  return {totalOperationalLoad,loadByDomain,highestPressureDomain,crossDomainAmplificationRisk,domainImbalanceRisk,enterpriseGovernanceLoadIndex:clamp(totalOperationalLoad/100000*100),recommendedFocusDomain:domainImbalanceRisk==='HIGH'?highestPressureDomain:null};
}

export function evaluateRuntimeDegradationThresholds(input:{telemetryPressure:number;replayPressure:number;workflowPressure:number;graphPressure:number;lineagePressure:number;storagePressure:number;tenantHistoryPressure:number;multiDomainLoadPressure:number;}){
  const mk=(degradationCategory:string,v:number)=>({degradationCategory,severity:risk3(v),thresholdBreached:v>70,recommendedAction:v>70?'IMMEDIATE_HARDENING':v>40?'SCHEDULED_HARDENING':'MONITOR',blocksProductionReadiness:v>70});
  return [mk('telemetry pressure',input.telemetryPressure),mk('replay pressure',input.replayPressure),mk('workflow pressure',input.workflowPressure),mk('graph pressure',input.graphPressure),mk('lineage pressure',input.lineagePressure),mk('storage pressure',input.storagePressure),mk('tenant history pressure',input.tenantHistoryPressure),mk('multi-domain load pressure',input.multiDomainLoadPressure)];
}

export function computeScaleProductionReadinessReport(input:{telemetryReadiness:'LOW'|'MEDIUM'|'HIGH';replayReadiness:'LOW'|'MEDIUM'|'HIGH';workflowReadiness:'LOW'|'MEDIUM'|'HIGH';graphReadiness:'LOW'|'MEDIUM'|'HIGH';lineageReadiness:'LOW'|'MEDIUM'|'HIGH';storageReadiness:'LOW'|'MEDIUM'|'HIGH';tenantHistoryReadiness:'LOW'|'MEDIUM'|'HIGH';multiDomainReadiness:'LOW'|'MEDIUM'|'HIGH';blockingRisks:string[];recommendedHardeningActions:string[];}){
  const vals=[input.telemetryReadiness,input.replayReadiness,input.workflowReadiness,input.graphReadiness,input.lineageReadiness,input.storageReadiness,input.tenantHistoryReadiness,input.multiDomainReadiness];
  const high=vals.filter((v)=>v==='HIGH').length;
  const medium=vals.filter((v)=>v==='MEDIUM').length;
  const scaleReadinessStatus=input.blockingRisks.length>0||high>0?'NOT_READY':medium>=2?'HARDENING_REQUIRED':'READY';
  return {...input,scaleReadinessStatus};
}
