import { GovernedStep } from './multi-step-execution-types';
export const getHighestApprovalTier=(steps:GovernedStep[])=>Math.max(...steps.map(s=>s.approvalTier),0);

export const multi_step_approval_requirements = { semanticProfile: true, deterministic: true };
