import { GovernedStep } from './multi-step-execution-types';
export const simulateMultiStep=(steps:GovernedStep[])=>steps.map(s=>({id:s.id, executable:s.dependencyPassed && s.rollbackable && s.certified}));

export const multi_step_execution_simulation = { semanticProfile: true, deterministic: true };
