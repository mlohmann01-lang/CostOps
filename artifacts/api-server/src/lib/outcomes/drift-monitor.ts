export type DriftSignal =
  | 'LICENSE_REASSIGNED_AFTER_RECLAIM'
  | 'EXCLUDED_ACCOUNT_MODIFIED'
  | 'ROLLBACK_MISMATCH'
  | 'UNEXPECTED_ENTITLEMENT_REAPPEARANCE'
  | 'SAVINGS_NO_LONGER_REALIZED';

export function detectOutcomeDrift(input: {
  licenseReassigned: boolean;
  excludedAccountModified: boolean;
  rollbackMismatch: boolean;
  entitlementReappeared: boolean;
  savingsNoLongerRealized: boolean;
}) {
  const reasons: DriftSignal[] = [];
  if (input.licenseReassigned) reasons.push('LICENSE_REASSIGNED_AFTER_RECLAIM');
  if (input.excludedAccountModified) reasons.push('EXCLUDED_ACCOUNT_MODIFIED');
  if (input.rollbackMismatch) reasons.push('ROLLBACK_MISMATCH');
  if (input.entitlementReappeared) reasons.push('UNEXPECTED_ENTITLEMENT_REAPPEARANCE');
  if (input.savingsNoLongerRealized) reasons.push('SAVINGS_NO_LONGER_REALIZED');
  return { driftDetected: reasons.length > 0, driftReason: reasons[0] ?? null, reasons };
}
