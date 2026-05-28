export type ConnectorHealthState = 'HEALTHY'|'DEGRADED'|'UNAVAILABLE'|'AUTH_FAILURE'|'RATE_LIMITED'|'STALE_DATA';
export function normalizeConnectorHealth(input: any): ConnectorHealthState {
  const s = String(input?.health ?? input?.state ?? input ?? 'HEALTHY').toUpperCase();
  if (['DEGRADED','UNAVAILABLE','AUTH_FAILURE','RATE_LIMITED','STALE_DATA','HEALTHY'].includes(s)) return s as ConnectorHealthState;
  if (s.includes('AUTH')) return 'AUTH_FAILURE';
  if (s.includes('RATE')) return 'RATE_LIMITED';
  if (s.includes('STALE')) return 'STALE_DATA';
  if (s.includes('DOWN') || s.includes('UNAVAILABLE')) return 'UNAVAILABLE';
  return 'DEGRADED';
}
