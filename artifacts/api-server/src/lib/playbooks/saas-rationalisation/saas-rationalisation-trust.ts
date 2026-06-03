import type { SaaSRationalisationTrustBand, SaaSRationalisationTrustInput, SaaSRationalisationTrustResult } from "./saas-rationalisation-types";

function band(score: number): SaaSRationalisationTrustBand {
  if (score >= 80) return "HIGH";
  if (score >= 60) return "MEDIUM";
  if (score > 0) return "LOW";
  return "BLOCKED";
}

export function scoreSaaSRationalisationTrust(input: SaaSRationalisationTrustInput): SaaSRationalisationTrustResult {
  const trustScore = Math.min(100, 40 +
    (input.ownerKnown ? 15 : 0) +
    (input.assignedUserCountKnown ? 15 : 0) +
    (input.activeUserCountKnown ? 15 : 0) +
    (input.annualCostKnown ? 15 : 0) +
    (input.evidenceRefsAvailable ? 10 : 0) +
    (input.approvedStatusKnown ? 10 : 0) +
    (input.renewalDateKnown ? 10 : 0));
  return {
    trustScore,
    trustBand: band(trustScore),
    reasons: [
      input.ownerKnown ? "Owner known" : "Owner missing",
      input.assignedUserCountKnown ? "Assigned user count known" : "Assigned user count missing",
      input.activeUserCountKnown ? "Active user count known" : "Active user count missing",
      input.annualCostKnown ? "Annual cost known" : "Annual cost missing",
      input.evidenceRefsAvailable ? "Evidence references available" : "Evidence references missing",
      input.approvedStatusKnown ? "Approval status known" : "Approval status missing",
      input.renewalDateKnown ? "Renewal date known" : "Renewal date missing",
    ],
  };
}
