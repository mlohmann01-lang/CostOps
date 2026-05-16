export type RecommendationRow = {
  id: number;
  displayName: string;
  userEmail: string;
  licenceSku: string;
  status: string;
  executionStatus: string;
  playbook: string;
  playbookName: string;
  daysSinceActivity: number | null;
  annualisedCost: number;
  monthlyCost: number;
  pricingConfidence?: string;
  pricingSource?: string;
  createdAt: string;
  warnings: string[];
  rejectionReason: string | null;
  trustScore: number;
};

const toNumber = (v: unknown, fallback = 0): number => typeof v === "number" ? v : Number(v ?? fallback) || fallback;
const toString = (v: unknown, fallback = ""): string => typeof v === "string" ? v : fallback;

export function toRecommendationRow(value: unknown): RecommendationRow {
  const row = (value ?? {}) as Record<string, unknown>;
  return {
    id: toNumber(row.id),
    displayName: toString(row.displayName, "Unknown user"),
    userEmail: toString(row.userEmail, "unknown@unknown"),
    licenceSku: toString(row.licenceSku, "UNKNOWN"),
    status: toString(row.status, "unknown"),
    executionStatus: toString(row.executionStatus, "UNKNOWN"),
    playbook: toString(row.playbook, "unknown-playbook"),
    playbookName: toString(row.playbookName, toString(row.playbook, "Unknown Playbook")),
    daysSinceActivity: row.daysSinceActivity == null ? null : toNumber(row.daysSinceActivity, 0),
    annualisedCost: toNumber(row.annualisedCost),
    monthlyCost: toNumber(row.monthlyCost),
    pricingConfidence: row.pricingConfidence == null ? undefined : toString(row.pricingConfidence),
    pricingSource: row.pricingSource == null ? undefined : toString(row.pricingSource),
    createdAt: toString(row.createdAt, new Date(0).toISOString()),
    warnings: Array.isArray(row.warnings) ? row.warnings.map((w) => String(w)) : [],
    rejectionReason: row.rejectionReason == null ? null : toString(row.rejectionReason),
    trustScore: toNumber(row.trustScore),
  };
}

export function safeArrayResponse<T>(value: unknown, context: string): T[] {
  if (Array.isArray(value)) return value as T[];
  console.warn(`[contract-guard] Expected array for ${context}; received`, value);
  return [];
}
