import { classifyFailure } from './partial-failure-classifier';
export const getExecutionState=(i:{preflight:boolean;provider:string;postflight:boolean;verified:boolean;rollbackFailed?:boolean;})=>{ const c=classifyFailure(i); return c==='NONE'?'COMPLETED':c==='PARTIAL_SUCCESS'?'PARTIAL':'FAILED'; };

export const partial_execution_state = { semanticProfile: true, deterministic: true };
