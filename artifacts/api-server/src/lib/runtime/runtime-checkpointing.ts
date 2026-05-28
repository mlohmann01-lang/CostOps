export interface RuntimeCheckpoint { tenantId:string; lastSuccessfulSchedulerRun:string; lastGovernanceEvaluationCycle:string; lastConnectorRefresh:string; lastDriftMonitorCycle:string; recoveryRequiredMarkers:string[]; }
const mem = new Map<string, RuntimeCheckpoint>();
export function upsertCheckpoint(c: RuntimeCheckpoint){ mem.set(c.tenantId,c); return c; }
export function getCheckpoint(tenantId:string){ return mem.get(tenantId) ?? null; }
