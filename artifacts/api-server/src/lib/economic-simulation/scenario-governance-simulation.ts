import type { ScenarioGovernanceSimulation } from './economic-simulation-types';
const c=(n:number)=>Math.max(0,Math.min(1,n));
export function simulateScenarioGovernance(input:{scenarioId:string;governanceDegradation:number;aiSprawlGrowth:number;approvalBottlenecks:number;shadowAiGrowth:number;ownershipDegradation:number;governanceTightening:number;policyEffectiveness:number;}):ScenarioGovernanceSimulation{return {...input,confidence:c((input.policyEffectiveness+input.governanceTightening)/2*(1-input.governanceDegradation*0.4))};}
