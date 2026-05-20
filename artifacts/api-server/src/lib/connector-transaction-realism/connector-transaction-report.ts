import { buildTransactionPlan } from './connector-transaction-plan';
import { TransactionInput } from './connector-transaction-types';
export const buildTransactionReport=(items:TransactionInput[])=>{ const plans=items.map(buildTransactionPlan); return {total:plans.length,ready:plans.filter(p=>p.ready).length,blocked:plans.filter(p=>!p.ready).length,retryBudget:plans.reduce((a,b)=>a+b.retryBudget,0)}; };
