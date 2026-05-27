import { deriveOutcomeState } from './outcome-status-engine';
import { validateSavings } from './savings-validator';

export type VerifyRemoveLicenseInput = {
  actionType: 'REMOVE_LICENSE';
  tenantId: string;
  targetUserValid: boolean;
  removedSkuIds: string[];
  currentAssignedSkuIds: string[];
  excludedAccountModified: boolean;
  rollbackAvailable: boolean;
  rollbackReference?: string;
  projectedMonthlySavings: number;
  verifiedMonthlySavings: number;
  policyViolationIntroduced: boolean;
};

export function verifyM365RemoveLicense(input: VerifyRemoveLicenseInput) {
  const licenseActuallyRemoved = input.removedSkuIds.every((sku) => !input.currentAssignedSkuIds.includes(sku));
  const checks = {
    licenseActuallyRemoved,
    targetUserStillValid: input.targetUserValid,
    projectedSavingsConfirmed: input.verifiedMonthlySavings > 0,
    rollbackStateAvailable: input.rollbackAvailable && Boolean(input.rollbackReference),
    noPolicyViolationIntroduced: !input.policyViolationIntroduced,
  };
  const passedChecks = Object.values(checks).filter(Boolean).length;
  const totalChecks = Object.keys(checks).length;
  const savings = validateSavings(input.projectedMonthlySavings, input.verifiedMonthlySavings);
  const state = deriveOutcomeState({ passedChecks, totalChecks, driftDetected: input.excludedAccountModified, verificationFailed: !checks.licenseActuallyRemoved, rolledBack: false });
  return { verificationState: state, checks, driftDetected: input.excludedAccountModified, driftReason: input.excludedAccountModified ? 'EXCLUDED_ACCOUNT_LATER_MODIFIED' : null, rollbackAvailable: checks.rollbackStateAvailable, rollbackReference: input.rollbackReference ?? null, verificationEvidence: { checks, removedSkuIds: input.removedSkuIds, currentAssignedSkuIds: input.currentAssignedSkuIds }, ...savings };
}
