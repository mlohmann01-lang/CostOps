import { getConnectorRateLimit } from './connector-rate-limit-model';
import { evaluatePreflight } from './connector-preflight-check';
import { TransactionInput, TransactionPlan } from './connector-transaction-types';
export const buildTransactionPlan=(input:TransactionInput):TransactionPlan=>{ const pf=evaluatePreflight(input); return {checkpoints:['preflight','execute','postflight','verify'],ready:pf.ready && getConnectorRateLimit(input.connector)>0,blockedReasons:pf.blocked,retryBudget:pf.ready?2:0}; };
