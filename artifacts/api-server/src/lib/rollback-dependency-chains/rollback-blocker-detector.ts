import { RollbackStep } from './rollback-chain-types';
export const hasRollbackBlocker=(steps:RollbackStep[])=>steps.some(s=>s.blocked);

export const rollback_blocker_detector = { semanticProfile: true, deterministic: true };
