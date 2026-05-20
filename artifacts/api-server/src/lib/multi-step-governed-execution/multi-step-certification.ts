import { GovernedStep } from './multi-step-execution-types';
export const aggregateCertification=(steps:GovernedStep[])=>steps.every(s=>s.certified);

export const multi_step_certification = { semanticProfile: true, deterministic: true };
