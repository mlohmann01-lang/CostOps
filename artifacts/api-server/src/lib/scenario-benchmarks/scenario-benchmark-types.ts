export interface Scenario{id:string;expectedGovernanceClass:'READ_ONLY'|'RECOMMEND_ONLY'|'APPROVAL_REQUIRED'|'BLOCKED';expectedDominantRisk:string;expectedArbitrationResult:string;risk:number;}
