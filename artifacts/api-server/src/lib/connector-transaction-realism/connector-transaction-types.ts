export type ProviderFailureClass='PROVIDER_TIMEOUT'|'PROVIDER_RATE_LIMITED'|'PROVIDER_REJECTED'|'PROVIDER_PARTIAL_SUCCESS'|'PROVIDER_STATE_STALE'|'PROVIDER_PERMISSION_DRIFT'|'PROVIDER_UNKNOWN_OUTCOME';
export interface TransactionInput { connector:string; actionId:string; requestedAt:number; stateTimestamp:number; hasPermission:boolean; duplicateRequest:boolean; }
export interface TransactionPlan { checkpoints:string[]; ready:boolean; blockedReasons:string[]; retryBudget:number; }
