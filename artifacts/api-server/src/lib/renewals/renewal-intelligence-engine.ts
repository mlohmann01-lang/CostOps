import type { Renewal, RenewalSummary } from "./renewal-types";
import { calculateRenewalReadiness } from "./renewal-readiness-engine";

export function summarizeRenewals(renewals: Renewal[]): RenewalSummary {
  const readiness = renewals.map(calculateRenewalReadiness);
  return { upcomingRenewals: renewals.filter((renewal) => renewal.daysRemaining <= 120).length, renewalSpend: renewals.reduce((sum, renewal) => sum + renewal.annualSpend, 0), recoverable: readiness.reduce((sum, row) => sum + row.recoverableSpend, 0), highRisk: renewals.filter((renewal) => renewal.renewalRisk === "HIGH").length };
}

export function buildRenewalIntelligenceRow(renewal: Renewal) {
  const readiness = calculateRenewalReadiness(renewal);
  return { ...renewal, readiness };
}
