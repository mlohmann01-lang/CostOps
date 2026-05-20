import { RollbackStep } from './rollback-chain-types';
export const buildRollbackChain=(orderedExecSteps:string[])=>[...orderedExecSteps].reverse().map((s)=>({stepId:s,dependsOn:[],risk:'MEDIUM' as const}));

export const rollback_chain_builder = { semanticProfile: true, deterministic: true };
