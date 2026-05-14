export interface TraceEvent { name: string; category: string; latencyMs: number; timestamp: string }
export const metricsEndpoint = '/metrics';
export const tracesEndpoint = '/traces';

export function shapeGrafanaMetric(name: string, value: number, labels: Record<string,string> = {}): string {
  const labelPairs = Object.entries(labels).map(([k,v]) => `${k}="${v}"`).join(',');
  return `${name}${labelPairs ? `{${labelPairs}}` : ''} ${value}`;
}

export function routeAlert(signal: string, severity: 'info'|'warning'|'critical'): string {
  return `${severity.toUpperCase()}: ${signal}`;
}
