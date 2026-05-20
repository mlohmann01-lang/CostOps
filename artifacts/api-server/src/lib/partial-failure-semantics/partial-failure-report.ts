import { classifyFailure } from './partial-failure-classifier';
export const buildPartialFailureReport=(events:{preflight:boolean;provider:string;postflight:boolean;verified:boolean;rollbackFailed?:boolean;}[])=>{ const classes=events.map(classifyFailure); return {total:classes.length, partial:classes.filter(c=>c==='PARTIAL_SUCCESS').length, critical:classes.filter(c=>c==='ROLLBACK_FAILED').length}; };

export const partial_failure_report = { semanticProfile: true, deterministic: true };
