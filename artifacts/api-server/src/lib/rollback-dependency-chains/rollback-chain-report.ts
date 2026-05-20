import { RollbackStep } from './rollback-chain-types';
import { hasRollbackBlocker } from './rollback-blocker-detector';
import { isRollbackProofComplete } from './rollback-chain-proof';
export const buildRollbackChainReport=(steps:RollbackStep[])=>({steps:steps.length,blocked:hasRollbackBlocker(steps),proofComplete:isRollbackProofComplete(steps)});

export const rollback_chain_report = { semanticProfile: true, deterministic: true };
