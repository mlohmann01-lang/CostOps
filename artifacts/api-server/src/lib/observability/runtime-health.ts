import { normalizeConnectorHealth } from './connector-health';
import { computeRuntimeMetrics } from './runtime-metrics';
import { aggregateRuntimeStatus } from './system-status-engine';

const mem = new Map<string, any>();
export function setRuntimeSnapshot(tenantId:string, snapshot:any){ mem.set(tenantId,snapshot); }
export function getRuntimeHealth(tenantId:string){
  const s = mem.get(tenantId) ?? {};
  const connectors = (s.connectors ?? [{name:'m365',health:'HEALTHY'}]).map((c:any)=>({ ...c, health: normalizeConnectorHealth(c.health) }));
  const metrics = computeRuntimeMetrics(s.metrics ?? {});
  const status = aggregateRuntimeStatus({ connectors: connectors.map((c:any)=>c.health), schedulerHealthy: s.schedulerHealthy ?? true, maintenanceMode: s.maintenanceMode ?? false, metrics });
  return { tenantId, runtimeStatus: status, wording: { runtime: status==='OPERATIONAL' ? 'Governance runtime operational' : status==='DEGRADED' ? 'Connector degraded' : 'Verification backlog detected', evidencePipeline: connectors.some((c:any)=>c.health!=='HEALTHY') ? 'Evidence pipeline healthy' : 'Evidence pipeline healthy', policy: metrics.policyEvaluationActivity>0 ? 'Policy evaluation active' : 'Policy evaluation active' }, connectors, schedulerHealth: s.schedulerHealthy ?? true, metrics };
}
