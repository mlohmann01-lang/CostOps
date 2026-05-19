import type { EconomicGovernanceClassification } from '../economic-intelligence-kernel';
export interface ArbitrationCandidate{id:string;savings:number;governanceRisk:number;volatilityRisk:number;recurrenceRisk:number;confidence:number;severity:number;}
export interface EconomicArbitrationDecision{primaryRecommendation:string;rejectedRecommendations:string[];deferredRecommendations:string[];arbitrationReasoning:string;confidence:number;severity:number;governanceClass:EconomicGovernanceClassification;causalityReferences:string[];recurrenceReferences:string[];replayReferences:string[];}
