import { RollbackStep } from './rollback-chain-types';
export const propagateRollbackRisk=(steps:RollbackStep[])=>steps.some(s=>s.risk==='HIGH')?'HIGH':'MEDIUM';

export const rollback_risk_propagation = { semanticProfile: true, deterministic: true };
