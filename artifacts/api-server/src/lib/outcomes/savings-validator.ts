export type SavingsValidationResult = {
  projectedMonthlySavings: number;
  verifiedMonthlySavings: number;
  projectedAnnualSavings: number;
  verifiedAnnualSavings: number;
  savingsVariance: number;
  projectedVsVerifiedDelta: number;
};

export function validateSavings(projectedMonthlySavings: number, verifiedMonthlySavings: number): SavingsValidationResult {
  const projectedMonthly = Number(projectedMonthlySavings || 0);
  const verifiedMonthly = Number(verifiedMonthlySavings || 0);
  const projectedAnnual = projectedMonthly * 12;
  const verifiedAnnual = verifiedMonthly * 12;
  return {
    projectedMonthlySavings: projectedMonthly,
    verifiedMonthlySavings: verifiedMonthly,
    projectedAnnualSavings: projectedAnnual,
    verifiedAnnualSavings: verifiedAnnual,
    savingsVariance: verifiedMonthly - projectedMonthly,
    projectedVsVerifiedDelta: projectedMonthly === 0 ? 0 : ((verifiedMonthly - projectedMonthly) / projectedMonthly) * 100,
  };
}
