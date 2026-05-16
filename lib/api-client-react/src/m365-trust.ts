import { customFetch } from "./custom-fetch";

export type ConnectorTrustSnapshot = {
  id: number;
  tenantId: string;
  connectorType: string;
  connectorId: string;
  sourceSystem: string;
  syncRunId: string;
  trustScore: string | number;
  trustBand: "HIGH" | "MEDIUM" | "LOW" | "QUARANTINED";
  freshnessScore: string | number;
  completenessScore: string | number;
  consistencyScore: string | number;
  identityMatchScore: string | number;
  sourceReliabilityScore: string | number;
  criticalFindings: string[];
  warningFindings: string[];
  createdAt: string;
};

export type ReconciliationFinding = {
  id: number;
  tenantId: string;
  connectorType: string;
  sourceSystem: string;
  entityType: string;
  entityId: string;
  findingType: string;
  severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  status: "OPEN" | "RESOLVED" | "SUPPRESSED";
  description: string;
  evidenceSnapshot: Record<string, unknown>;
  recommendedResolution: string;
  createdAt: string;
  resolvedAt?: string | null;
};

export const getM365Trust = (tenantId = "default") =>
  customFetch<ConnectorTrustSnapshot[]>(`/api/connectors/m365/trust?tenantId=${encodeURIComponent(tenantId)}`, { method: "GET" });

export const getM365ReconciliationFindings = (tenantId = "default") =>
  customFetch<ReconciliationFinding[]>(`/api/connectors/m365/reconciliation-findings?tenantId=${encodeURIComponent(tenantId)}`, { method: "GET" });

export const resolveM365ReconciliationFinding = (id: number) =>
  customFetch<ReconciliationFinding>(`/api/connectors/m365/reconciliation-findings/${id}/resolve`, { method: "POST" });

export const suppressM365ReconciliationFinding = (id: number) =>
  customFetch<ReconciliationFinding>(`/api/connectors/m365/reconciliation-findings/${id}/suppress`, { method: "POST" });
