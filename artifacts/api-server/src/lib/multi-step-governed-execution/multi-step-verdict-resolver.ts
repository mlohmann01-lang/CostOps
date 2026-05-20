import { GovernedStep } from './multi-step-execution-types';
export const resolveFinalVerdict=(steps:GovernedStep[])=> steps.some(s=>s.verdict==='BLOCKED')?'BLOCKED':steps.some(s=>s.verdict==='MANUAL_ONLY')?'MANUAL_ONLY':'PASS';

export const multi_step_verdict_resolver = { semanticProfile: true, deterministic: true };
