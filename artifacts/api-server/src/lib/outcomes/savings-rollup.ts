export type OutcomeRowLike = {
  tenantId?: string;
  action?: string;
  playbookId?: string;
  monthlySaving?: number;
  annualisedSaving?: number;
  evidence?: any;
};

export function rollupSavings(rows: OutcomeRowLike[]) {
  const n = (v: any) => Number(v ?? 0);
  const summary = {
    projectedMonthlySavings: 0,
    verifiedMonthlySavings: 0,
    projectedAnnualSavings: 0,
    verifiedAnnualSavings: 0,
    savingsVariance: 0,
    driftDetectedCount: 0,
    driftPreventedCount: 0,
    failedVerificationCount: 0,
    pendingVerificationCount: 0,
    rollbackAvailabilityCount: 0,
  };
  for (const r of rows) {
    const ev = (r.evidence ?? {}) as any;
    const verificationState = String(ev.verificationState ?? 'PENDING_VERIFICATION');
    const projectedMonthly = n(r.monthlySaving);
    const verifiedMonthly = n(ev.verifiedSaving ?? ev.verifiedMonthlySavings ?? 0);
    summary.projectedMonthlySavings += projectedMonthly;
    summary.verifiedMonthlySavings += verifiedMonthly;
    summary.projectedAnnualSavings += n(r.annualisedSaving ?? projectedMonthly * 12);
    summary.verifiedAnnualSavings += n(ev.verifiedAnnualSavings ?? verifiedMonthly * 12);
    if (String(ev.driftStatus ?? '') === 'DRIFT_DETECTED') summary.driftDetectedCount += 1;
    if (String(ev.driftStatus ?? '') === 'NO_DRIFT_DETECTED' && verificationState === 'VERIFIED') summary.driftPreventedCount += 1;
    if (verificationState === 'FAILED_VERIFICATION' || verificationState === 'VERIFICATION_FAILED') summary.failedVerificationCount += 1;
    if (verificationState === 'PENDING_VERIFICATION') summary.pendingVerificationCount += 1;
    if (String(ev.rollbackStatus ?? ev.rollbackPlan?.status ?? '').includes('ROLLBACK') || ev.rollbackReference) summary.rollbackAvailabilityCount += 1;
  }
  summary.savingsVariance = summary.verifiedMonthlySavings - summary.projectedMonthlySavings;
  return summary;
}
