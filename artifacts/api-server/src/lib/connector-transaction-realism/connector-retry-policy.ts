import { ProviderFailureClass } from './connector-transaction-types';
export const getRetryBudget=(failure:ProviderFailureClass)=> failure==='PROVIDER_RATE_LIMITED'?3:failure==='PROVIDER_TIMEOUT'?2:0;
