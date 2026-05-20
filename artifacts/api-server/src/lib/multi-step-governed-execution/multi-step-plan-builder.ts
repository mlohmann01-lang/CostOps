import { GovernedStep } from './multi-step-execution-types';
export const buildMultiStepPlan=(steps:GovernedStep[])=>steps.filter(s=>s.certified);

export const multi_step_plan_builder = { semanticProfile: true, deterministic: true };
