export type AIUsageMode = "SAAS" | "API" | "AGENT";

export interface AIUsageRecord {
  tenantId: string;
  userId: string;
  toolId: string;
  model: string;
  mode: AIUsageMode;
  timestamp: string;
  tokens: number;
  estimatedCost: number;
  operationType: string;
  productivitySignal: number;
}

export function normalizeAIUsageRecord(input: Partial<AIUsageRecord> & Pick<AIUsageRecord, "tenantId" | "userId" | "toolId">): AIUsageRecord {
  return {
    tenantId: input.tenantId,
    userId: input.userId,
    toolId: input.toolId,
    model: input.model ?? "unknown",
    mode: input.mode ?? "SAAS",
    timestamp: input.timestamp ?? new Date().toISOString(),
    tokens: Math.max(0, Number(input.tokens ?? 0)),
    estimatedCost: Math.max(0, Number(input.estimatedCost ?? 0)),
    operationType: input.operationType ?? "UNKNOWN_OPERATION",
    productivitySignal: Number(input.productivitySignal ?? 0),
  };
}

export function aggregateUsageCost(records: AIUsageRecord[]): number {
  return records.reduce((sum, record) => sum + record.estimatedCost, 0);
}
