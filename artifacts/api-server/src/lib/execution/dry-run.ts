export function runDryRun(recommendation: any) {
  return {
    simulated: true,
    action: "REMOVE_LICENSE",
    monthlySaving: recommendation.monthlyCost,
    annualisedSaving: recommendation.annualisedCost,
    mutationPerformed: false,
  };
}
