export type OutcomeVerificationState =
  | 'PENDING_VERIFICATION'
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'DRIFT_DETECTED'
  | 'VERIFICATION_FAILED'
  | 'ROLLED_BACK';

export function deriveOutcomeState(input: {
  passedChecks: number;
  totalChecks: number;
  driftDetected: boolean;
  verificationFailed: boolean;
  rolledBack: boolean;
}): OutcomeVerificationState {
  if (input.rolledBack) return 'ROLLED_BACK';
  if (input.driftDetected) return 'DRIFT_DETECTED';
  if (input.verificationFailed) return 'VERIFICATION_FAILED';
  if (input.totalChecks <= 0 || input.passedChecks <= 0) return 'PENDING_VERIFICATION';
  if (input.passedChecks >= input.totalChecks) return 'VERIFIED';
  return 'PARTIALLY_VERIFIED';
}
