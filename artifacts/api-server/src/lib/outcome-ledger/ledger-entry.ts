export type SavingConfidence = "ESTIMATED" | "VERIFIED";

export type LedgerEntryInput = {
  tenantId: string;
  recommendation: any;
  recommendationId: string;
  action: string;
  idempotencyKey: string;
  trustSnapshot: Record<string, unknown>;
  actionRiskProfile: Record<string, unknown>;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  dryRunResult: Record<string, unknown>;
  executionEvidence: Record<string, unknown>;
  actorId: string;
  executionMode: string;
  executionStatus: string;
  pricingSnapshot?: Record<string, unknown>;
  pricingConfidence?: string;
  pricingSource?: string;
};
