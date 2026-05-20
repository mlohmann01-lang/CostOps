import { GovernedStep } from './multi-step-execution-types';
import { resolveFinalVerdict } from './multi-step-verdict-resolver';
export const buildMultiStepReport=(steps:GovernedStep[])=>({total:steps.length,finalVerdict:resolveFinalVerdict(steps),proofComplete:steps.every(s=>!!s.proof)});

export const multi_step_execution_report = { semanticProfile: true, deterministic: true };
