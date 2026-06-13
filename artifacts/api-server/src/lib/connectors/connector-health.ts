import type { ExecutionConnectorType } from "../execution/governed-execution";
import { governedExecutionService } from "../execution/governed-execution";
import { getPersistenceProvider, PersistenceStore } from "../persistence/persistence-provider";
import { PersistenceCollections } from "../persistence/persistence-collections";


export type FreshnessBand = "0_7" | "8_30" | "31_90" | "GT_90" | "UNKNOWN";
export function freshnessBandFromDays(days?: number | null): FreshnessBand { if (days === undefined || days === null || Number.isNaN(days)) return "UNKNOWN"; if (days <= 7) return "0_7"; if (days <= 30) return "8_30"; if (days <= 90) return "31_90"; return "GT_90"; }
export function freshnessScoreFromBand(band: FreshnessBand) { return band === "0_7" ? 100 : band === "8_30" ? 80 : band === "31_90" ? 50 : band === "GT_90" ? 20 : 0; }

export type ConnectorHealthStatus = "HEALTHY" | "DEGRADED" | "DISCONNECTED" | "EXPIRED_CREDENTIALS" | "MISSING_SCOPES" | "RATE_LIMITED";
export type ConnectorHealthReport = { tenantId: string; connectorId: string; connectorType: "M365" | "AI" | "SERVICENOW" | "AWS" | "AZURE" | "SNOWFLAKE" | "DATABRICKS"; status: ConnectorHealthStatus; lastCheckedAt: string; credentialExpiresAt?: string; scopes?: string[]; missingScopes?: string[]; rateLimitResetAt?: string; errors: string[] };
type CredentialMetadata = { credentialExpiresAt?: string; scopes?: string[]; requiredScopes?: string[]; rateLimitResetAt?: string; statusOverride?: ConnectorHealthStatus; errors?: string[] };
const reports = new Map<string, ConnectorHealthReport>();
const metadata = new Map<string, CredentialMetadata>();
const healthStore = new PersistenceStore<ConnectorHealthReport & { id: string; createdAt: string; updatedAt: string }>(getPersistenceProvider(), PersistenceCollections.CONNECTOR_HEALTH_REPORTS);
function key(tenantId: string, connectorId: string) { return `${tenantId}:${connectorId}`; }
function now() { return new Date().toISOString(); }
function isLiveType(type: ExecutionConnectorType): type is "M365" | "AI" | "SERVICENOW" | "AWS" | "AZURE" | "SNOWFLAKE" | "DATABRICKS" { return ["M365", "AI", "SERVICENOW", "AWS", "AZURE", "SNOWFLAKE", "DATABRICKS"].includes(type); }
function assertTenantScopedResource<T extends { tenantId?: string } | null>(tenantId: string, resource: T): T { if (resource && resource.tenantId !== tenantId) throw new Error("TENANT_SCOPE_VIOLATION"); return resource; }
function assertTenantScopedCollection<T extends { tenantId?: string }>(tenantId: string, rows: T[]) { rows.forEach((row) => assertTenantScopedResource(tenantId, row)); return rows; }
export function refreshConnectorCredentialMetadata(tenantId: string, connectorId: string, input: CredentialMetadata) { metadata.set(key(tenantId, connectorId), input); return input; }
export function clearConnectorHealth() { reports.clear(); metadata.clear(); healthStore.clearAll(); }
export function getConnectorHealth(tenantId: string, connectorId: string) { return reports.get(key(tenantId, connectorId)) ?? null; }
export function evaluateConnectorHealth(input: { tenantId: string; connectorId: string; requiredScopes?: string[] }): ConnectorHealthReport {
  const connector = governedExecutionService.listConnectors(input.tenantId).find((row) => row.id === input.connectorId) ?? null;
  assertTenantScopedResource(input.tenantId, connector);
  if (!connector || !isLiveType(connector.connectorType)) throw new Error("CONNECTOR_NOT_FOUND_OR_UNSUPPORTED");
  const meta = metadata.get(key(input.tenantId, input.connectorId)) ?? {};
  const required = input.requiredScopes ?? meta.requiredScopes ?? [];
  const scopes = meta.scopes ?? [];
  const missingScopes = required.filter((scope) => !scopes.includes(scope));
  let status: ConnectorHealthStatus = meta.statusOverride ?? (connector.status === "DISCONNECTED" ? "DISCONNECTED" : connector.status === "DEGRADED" ? "DEGRADED" : "HEALTHY");
  const errors = [...(meta.errors ?? [])];
  if (meta.credentialExpiresAt && new Date(meta.credentialExpiresAt).getTime() <= Date.now()) { status = "EXPIRED_CREDENTIALS"; errors.push("Connector credentials are expired."); }
  if (missingScopes.length) { status = "MISSING_SCOPES"; errors.push(`Missing required scopes: ${missingScopes.join(",")}`); }
  const timestamp = now();
  const report: ConnectorHealthReport = { tenantId: input.tenantId, connectorId: connector.id, connectorType: connector.connectorType, status, lastCheckedAt: timestamp, credentialExpiresAt: meta.credentialExpiresAt, scopes, missingScopes, rateLimitResetAt: meta.rateLimitResetAt, errors };
  reports.set(key(input.tenantId, connector.id), report);
  healthStore.upsert({ ...report, id: key(report.tenantId, report.connectorId), createdAt: timestamp, updatedAt: timestamp }).catch(() => {});
  return report;
}
export function getConnectorHealthDashboard(tenantId: string) {
  const connectors = governedExecutionService.listConnectors(tenantId).filter((connector) => isLiveType(connector.connectorType));
  const rows = connectors.map((connector) => reports.get(key(tenantId, connector.id)) ?? evaluateConnectorHealth({ tenantId, connectorId: connector.id }));
  return assertTenantScopedCollection(tenantId, rows);
}
