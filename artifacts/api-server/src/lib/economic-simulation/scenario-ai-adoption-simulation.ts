import type { ScenarioAIAdoptionSimulation } from './economic-simulation-types';
const c=(n:number)=>Math.max(0,Math.min(1,n));
export function simulateScenarioAIAdoption(input:{scenarioId:string;adoptionAcceleration:number;rolloutSuccessLikelihood:number;toolSprawlGrowth:number;productivityRealization:number;governanceDeterioration:number;}):ScenarioAIAdoptionSimulation{ return {...input,aiEfficiencyTrajectory:c(input.adoptionAcceleration*0.4+input.productivityRealization*0.4-input.toolSprawlGrowth*0.3),confidence:c(input.rolloutSuccessLikelihood*(1-input.toolSprawlGrowth*0.3))}; }
