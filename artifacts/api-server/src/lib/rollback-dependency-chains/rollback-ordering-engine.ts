import { RollbackStep } from './rollback-chain-types';
export const orderRollback=(steps:RollbackStep[])=>steps.map(s=>s.stepId);

export const rollback_ordering_engine = { semanticProfile: true, deterministic: true };
