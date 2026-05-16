import { customFetch } from "./custom-fetch";

export type ResolveRecommendationOutcomePayload = { tenantId?: string };

export async function resolveRecommendationOutcome(id: string | number, payload: ResolveRecommendationOutcomePayload = {}) {
  return customFetch<any>(`/api/playbooks/recommendations/${id}/outcomes/resolve`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getRecommendationOutcomes(id: string | number, tenantId = "default") {
  return customFetch<any[]>(`/api/playbooks/recommendations/${id}/outcomes?tenantId=${encodeURIComponent(tenantId)}`, { method: "GET" });
}

export async function getLatestRecommendationOutcome(id: string | number, tenantId = "default") {
  return customFetch<any>(`/api/playbooks/recommendations/${id}/outcomes/latest?tenantId=${encodeURIComponent(tenantId)}`, { method: "GET" });
}

export async function getRecommendationOutcomeIntegrity(id: string | number, tenantId = "default") {
  return customFetch<any>(`/api/playbooks/recommendations/${id}/outcomes/integrity?tenantId=${encodeURIComponent(tenantId)}`, { method: "GET" });
}

export async function getM365RealizedIntelligence(tenantId = "default") {
  return customFetch<any>(`/api/playbooks/connectors/m365/realized-intelligence?tenantId=${encodeURIComponent(tenantId)}`, { method: "GET" });
}
