import { db, governancePolicyEvaluationsV1Table, policyEvaluationsTable } from '@workspace/db';
import { evaluatePolicy, type GovernanceEntityType } from './policy-evaluator';

export async function evaluateAndPersistPolicy(input: {
  tenantId: string; entityType: GovernanceEntityType; entityId: string; policyName: string; entity: any; triggeredBy: string; now?: Date;
}) {
  const now = input.now ?? new Date();
  const out = evaluatePolicy(input.policyName, input.entity, { now, approvalExpiresHours: Number(process.env.GOV_APPROVAL_EXPIRY_HOURS ?? 24), dryRunExpiresHours: Number(process.env.GOV_DRY_RUN_EXPIRY_HOURS ?? 24), autoExecuteSafeEnabled: String(process.env.AUTO_EXECUTE_SAFE_ENABLED ?? 'false') === 'true' });
  try {
    const [row] = await db.insert(governancePolicyEvaluationsV1Table).values({ evaluationId: `gpe-${input.tenantId}-${input.entityType}-${input.entityId}-${input.policyName}-${now.getTime()}`, tenantId: input.tenantId, entityType: input.entityType, entityId: input.entityId, policyName: input.policyName, evaluationResult: out.result, evaluationReason: out.reason, evaluatedAt: now, triggeredBy: input.triggeredBy, evidenceSnapshot: input.entity ?? {} }).returning();
    return row;
  } catch {
    return { evaluationId: `gpe-${input.tenantId}-${input.entityType}-${input.entityId}`, tenantId: input.tenantId, entityType: input.entityType, entityId: input.entityId, policyName: input.policyName, evaluationResult: out.result, evaluationReason: out.reason, evaluatedAt: now, triggeredBy: input.triggeredBy, evidenceSnapshot: input.entity ?? {} } as any;
  }
}

export async function evaluateExecutionPolicy(input: any) {
  const reasons: string[] = [];
  if (Array.isArray(input?.criticalBlockers) && input.criticalBlockers.length > 0) reasons.push('CRITICAL_BLOCKERS_PRESENT');
  if (String(input?.riskClass ?? '').toUpperCase() === 'C' && String(input?.trustGate ?? '').toUpperCase() === 'APPROVAL_REQUIRED') reasons.push('LOW_TRUST_APPROVAL_REQUIRED');
  const decision = reasons.length > 0 ? 'BLOCK' : 'ALLOW';
  return { decision, reasons: reasons.length ? reasons : ['POLICY_ALLOW'], evidence: { riskClass: input?.riskClass ?? 'UNKNOWN', executionMode: input?.executionMode ?? 'UNKNOWN', trustGate: input?.trustGate ?? 'UNKNOWN' } };
}

export async function createPolicyEvaluation(input: { tenantId: string; recommendationId: string; actorId: string | null; decision: string; reasons: string[]; evidence: any }) {
  try {
    const [row] = await db.insert(policyEvaluationsTable).values({ tenantId: input.tenantId, recommendationId: input.recommendationId, actorId: input.actorId ?? 'system', decision: input.decision, reasons: input.reasons ?? [], evidence: input.evidence ?? {} }).returning();
    return row;
  } catch {
    return { tenantId: input.tenantId, recommendationId: input.recommendationId, actorId: input.actorId ?? 'system', decision: input.decision, reasons: input.reasons ?? [], evidence: input.evidence ?? {} } as any;
  }
}

export async function evaluateApprovalPolicy(input: any) {
  const riskClass = String(input?.riskClass ?? 'B');
  return { requiredApproverRole: riskClass === 'A' ? 'DUAL_APPROVAL' : 'FINOPS_APPROVER', decision: 'ALLOW', reasons: ['APPROVAL_POLICY_V1'], evidence: { riskClass, action: input?.action ?? 'UNKNOWN' } };
}
