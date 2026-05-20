import { PartialFailureClass } from './partial-failure-types';
export const requiresRollback=(c:PartialFailureClass)=>['PARTIAL_SUCCESS','POSTFLIGHT_MISMATCH','ROLLBACK_REQUIRED'].includes(c);

export const partial_rollback_requirement = { semanticProfile: true, deterministic: true };
