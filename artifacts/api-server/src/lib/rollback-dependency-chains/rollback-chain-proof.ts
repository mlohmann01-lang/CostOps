import { RollbackStep } from './rollback-chain-types';
export const isRollbackProofComplete=(steps:RollbackStep[])=>steps.every(s=>!!s.rollbackProof);

export const rollback_chain_proof = { semanticProfile: true, deterministic: true };
