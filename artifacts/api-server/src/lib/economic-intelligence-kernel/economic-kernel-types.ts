export type EconomicDomain = 'M365'|'CLOUD'|'COMMITMENT'|'KUBERNETES'|'AI_RUNTIME'|'FINOPS'|'EXECUTIVE'|'ENTERPRISE';
export type EconomicGovernanceClassification='READ_ONLY'|'RECOMMEND_ONLY'|'APPROVAL_REQUIRED'|'BLOCKED';
export type Score10={dataCompleteness:number;dataFreshness:number;signalConsistency:number;ownershipClarity:number;costTraceability:number;usageSignalQuality:number;reversibility:number;policyFit:number;forecastStability:number;replayConfidence:number;};
export interface EconomicConfidenceInput extends Score10{domain:EconomicDomain;}
export interface EconomicConfidenceResult{domain:EconomicDomain;score:number;lowConfidenceDimensions:(keyof Score10)[];}
export interface EconomicSeverityInput{domain:EconomicDomain;monthlyImpact:number;annualizedImpact:number;recurrenceRisk:number;blastRadius:number;volatility:number;executiveMateriality:number;governanceExposure:number;}
export interface EconomicSeverityResult{domain:EconomicDomain;score:number;tier:'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';}
export interface EconomicVolatilityInput{domain:EconomicDomain;volatility:number;forecastStability:number;burstVolatility?:number;}
export interface EconomicVolatilityResult{domain:EconomicDomain;score:number;band:'STABLE'|'VARIABLE'|'UNSTABLE';}
export interface EconomicEvidenceReference{id:string;source:string;lineageId:string;replayId:string;confidence:number;capturedAt:string;}
export interface EconomicForecastContract{forecastId:string;confidence:number;stability:number;horizonDays:number;evidenceReferences:EconomicEvidenceReference[];}
export interface EconomicRecommendationContract{domain:EconomicDomain;title:string;reviewMode:'READ_ONLY'|'RECOMMEND_ONLY'|'APPROVAL_REQUIRED';confidence:number;severity:number;evidenceReferences:EconomicEvidenceReference[];notes?:string;}
export interface EconomicKernelAssessment{domain:EconomicDomain;confidence:EconomicConfidenceResult;severity:EconomicSeverityResult;volatility:EconomicVolatilityResult;governance:EconomicGovernanceClassification;}
