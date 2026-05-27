export type GovernanceEntityType = 'APPROVAL'|'DRY_RUN'|'CONNECTOR'|'RECOMMENDATION'|'EXECUTION_REQUEST';
export type EvaluationResult = 'PASS'|'FAIL'|'WARN';

export type PolicyInput = {
  now: Date;
  approvalExpiresHours: number;
  dryRunExpiresHours: number;
  autoExecuteSafeEnabled: boolean;
};

export function evaluatePolicy(policyName: string, entity: any, input: PolicyInput): { result: EvaluationResult; reason: string } {
  const ageHours = (at?: string | Date | null) => at ? (input.now.getTime() - new Date(at).getTime()) / 3600000 : Number.POSITIVE_INFINITY;
  if (policyName === 'APPROVAL_EXPIRES_AFTER_X_HOURS') {
    const expired = ageHours(entity.createdAt) > input.approvalExpiresHours && String(entity.approvalStatus ?? '').toUpperCase() === 'PENDING';
    return expired ? { result: 'FAIL', reason: 'APPROVAL_EXPIRED' } : { result: 'PASS', reason: 'APPROVAL_VALID' };
  }
  if (policyName === 'DRY_RUN_EXPIRES_AFTER_X_HOURS') {
    const expired = ageHours(entity.simulatedAt) > input.dryRunExpiresHours;
    return expired ? { result: 'FAIL', reason: 'DRY_RUN_EXPIRED' } : { result: 'PASS', reason: 'DRY_RUN_VALID' };
  }
  if (policyName === 'CONNECTOR_MUST_REMAIN_HEALTHY') {
    const healthy = String(entity.connectorHealth ?? entity.status ?? '').toUpperCase().includes('HEALTHY');
    return healthy ? { result: 'PASS', reason: 'CONNECTOR_HEALTHY' } : { result: 'FAIL', reason: 'CONNECTOR_DEGRADED' };
  }
  if (policyName === 'AUTO_EXECUTE_SAFE_GLOBALLY_DISABLED') {
    return input.autoExecuteSafeEnabled ? { result: 'FAIL', reason: 'AUTO_EXECUTE_SAFE_ENABLED' } : { result: 'PASS', reason: 'AUTO_EXECUTE_SAFE_DISABLED' };
  }
  return { result: 'WARN', reason: 'POLICY_NOT_IMPLEMENTED' };
}
