import type { CrossDomainCorrelationResult, CrossDomainUsageSignal } from "./cross-domain-economic-types";

export function correlateCrossDomainUsage(signals: CrossDomainUsageSignal[]): CrossDomainCorrelationResult[] {
  const out: CrossDomainCorrelationResult[] = [];
  const tenantId = signals[0]?.tenantId ?? "default";
  const byUser = new Map<string, CrossDomainUsageSignal[]>();
  for (const s of signals) byUser.set(s.entityRef.entityId, [...(byUser.get(s.entityRef.entityId) ?? []), s]);
  let i = 0;
  for (const [_, rows] of byUser) {
    const m365 = rows.find((r) => r.domain === "M365"); const ai = rows.find((r) => r.domain === "AI_ECONOMICS");
    if (m365 && ai) out.push({ correlationId:`corr:${i++}`, tenantId, involvedEntities:[m365.entityRef, ai.entityRef], correlationType:"DEVELOPER_AI_TOOL_USAGE_VS_M365_ACTIVITY", strength: ai.usageVolume > m365.usageVolume ? "HIGH" : "MODERATE", confidence: Math.min(m365.confidence, ai.confidence), explanation:"User has both M365 and AI usage footprints.", evidenceRefs:[...m365.evidenceRefs, ...ai.evidenceRefs] });
  }
  return out;
}
