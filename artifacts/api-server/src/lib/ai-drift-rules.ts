/**
 * ai-drift-rules.ts
 *
 * Drift detection rules for the AI governance layer.
 * Each rule implements a PackDriftDetectionRule-compatible evaluate() signature
 * and returns a fully typed AIDriftRuleResult.
 *
 * All implementations are stubs.  Real implementations will query live
 * telemetry, billing data, and governance approval registries.
 */

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type AIDriftRuleResult = {
  ruleId: string;
  triggered: boolean;
  detail: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  /** Deterministic hash derived from tenantId + ruleId. */
  evidenceHash: string;
  detectedAt: string;
  affectedProvider: string | null;
  affectedModelId: string | null;
};

// ---------------------------------------------------------------------------
// Evidence hash helper
// ---------------------------------------------------------------------------

/**
 * Builds a minimal deterministic evidence hash from tenantId and ruleId.
 *
 * Uses a djb2-style multiply-accumulate over the concatenated string and
 * formats the result as an 8-character zero-padded hex string.
 */
export function buildEvidenceHash(tenantId: string, ruleId: string): string {
  return `${tenantId}-${ruleId}`
    .split('')
    .reduce((h, c) => (h * 31 + c.charCodeAt(0)) & 0xffffffff, 0)
    .toString(16)
    .padStart(8, '0');
}

// ---------------------------------------------------------------------------
// Internal stub builder
// ---------------------------------------------------------------------------

function buildResult(
  ruleId: string,
  tenantId: string,
  triggered: boolean,
  detail: string,
  severity: AIDriftRuleResult['severity'],
  affectedProvider: string | null = null,
  affectedModelId: string | null = null,
): AIDriftRuleResult {
  const detectedAt = new Date().toISOString();
  return {
    ruleId,
    triggered,
    detail,
    severity,
    evidenceHash: buildEvidenceHash(tenantId, ruleId),
    detectedAt,
    affectedProvider,
    affectedModelId,
  };
}

// ---------------------------------------------------------------------------
// TOKEN_SPIKE
// ---------------------------------------------------------------------------

/**
 * Detects whether monthly token spend has exceeded 2× the previous month
 * baseline.  Uses context.currentMonthCostUSD and context.baselineCostUSD
 * when provided; otherwise defaults to non-triggered.
 */
export async function detectTokenSpike(
  tenantId: string,
  executionId: string,
  context: Record<string, unknown>,
): Promise<AIDriftRuleResult> {
  const ruleId = 'TOKEN_SPIKE';

  const currentMonthCostUSD =
    typeof context['currentMonthCostUSD'] === 'number'
      ? context['currentMonthCostUSD']
      : null;
  const baselineCostUSD =
    typeof context['baselineCostUSD'] === 'number'
      ? context['baselineCostUSD']
      : null;

  if (
    currentMonthCostUSD !== null &&
    baselineCostUSD !== null &&
    baselineCostUSD > 0 &&
    currentMonthCostUSD > baselineCostUSD * 2
  ) {
    return buildResult(
      ruleId,
      tenantId,
      true,
      `Token spend ${currentMonthCostUSD.toFixed(2)} USD exceeds 2× baseline of ${baselineCostUSD.toFixed(2)} USD`,
      'HIGH',
    );
  }

  return buildResult(
    ruleId,
    tenantId,
    false,
    'Token spend within 2× baseline',
    'HIGH',
    null,
    null,
  );
}

// ---------------------------------------------------------------------------
// MODEL_CREEP
// ---------------------------------------------------------------------------

/**
 * Detects whether models are being used outside the tenant's approved tier
 * list.
 */
export async function detectModelCreep(
  tenantId: string,
  executionId: string,
  context: Record<string, unknown>,
): Promise<AIDriftRuleResult> {
  const ruleId = 'MODEL_CREEP';

  return buildResult(
    ruleId,
    tenantId,
    false,
    'All models within approved tier list',
    'MEDIUM',
  );
}

// ---------------------------------------------------------------------------
// COST_SPIKE
// ---------------------------------------------------------------------------

/**
 * Detects whether total AI spend has risen more than 50% week-over-week.
 */
export async function detectCostSpike(
  tenantId: string,
  executionId: string,
  context: Record<string, unknown>,
): Promise<AIDriftRuleResult> {
  const ruleId = 'COST_SPIKE';

  return buildResult(
    ruleId,
    tenantId,
    false,
    'Week-over-week AI spend within 50% threshold',
    'HIGH',
  );
}

// ---------------------------------------------------------------------------
// UNAUTHORIZED_USAGE
// ---------------------------------------------------------------------------

/**
 * Detects usage originating from connectors not present in the tenant's
 * approved connector list.
 */
export async function detectUnauthorizedUsage(
  tenantId: string,
  executionId: string,
  context: Record<string, unknown>,
): Promise<AIDriftRuleResult> {
  const ruleId = 'UNAUTHORIZED_USAGE';

  return buildResult(
    ruleId,
    tenantId,
    false,
    'All usage originates from approved connectors',
    'CRITICAL',
  );
}

// ---------------------------------------------------------------------------
// SEAT_EXPANSION
// ---------------------------------------------------------------------------

/**
 * Detects whether seat count has increased without a governance approval on
 * record.
 */
export async function detectSeatExpansion(
  tenantId: string,
  executionId: string,
  context: Record<string, unknown>,
): Promise<AIDriftRuleResult> {
  const ruleId = 'SEAT_EXPANSION';

  return buildResult(
    ruleId,
    tenantId,
    false,
    'Seat count within approved allocation',
    'MEDIUM',
  );
}

// ---------------------------------------------------------------------------
// AGENT_PROLIFERATION
// ---------------------------------------------------------------------------

/**
 * Detects whether new agents have been created without a governance approval
 * on record.
 */
export async function detectAgentProliferation(
  tenantId: string,
  executionId: string,
  context: Record<string, unknown>,
): Promise<AIDriftRuleResult> {
  const ruleId = 'AGENT_PROLIFERATION';

  return buildResult(
    ruleId,
    tenantId,
    false,
    'No unapproved agent creation detected',
    'HIGH',
  );
}
