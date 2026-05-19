import type { EconomicDomain, EconomicGovernanceClassification } from '../economic-intelligence-kernel';
export interface EconomicReplayReference{replayId:string;timestamp:string;version:string;}
export interface EconomicLineageReference{lineageId:string;sourceSystem:string;entityId:string;}
export interface EconomicEvidenceReference{id:string;source:string;capturedAt:string;confidence:number;lineage:EconomicLineageReference;replay:EconomicReplayReference;}
export interface EconomicRecommendationReference{id:string;domain:EconomicDomain;title:string;reviewMode:'READ_ONLY'|'RECOMMEND_ONLY'|'APPROVAL_REQUIRED';evidence:EconomicEvidenceReference[];}
export interface EconomicForecastWindow{startDate:string;endDate:string;horizonDays:number;}
export interface EconomicCalibrationMetadata{historicalWeight:number;decayFactor:number;recurrenceWeight:number;stabilityWeight:number;}
export interface EconomicGovernanceEnvelope{classification:EconomicGovernanceClassification;rationale:string;requiresApproval:boolean;}
export interface EconomicConfidenceEnvelope{score:number;dimensions:Record<string,number>;}
export interface EconomicSeverityEnvelope{score:number;tier:'LOW'|'MEDIUM'|'HIGH'|'CRITICAL';}
export const assertDeterministicEconomicContract=(s:number)=>{ if(!Number.isFinite(s)||s<0||s>1) throw new Error('Deterministic contract score out of bounds');};
