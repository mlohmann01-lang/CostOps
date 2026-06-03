import type { RenewalTrustInput, RenewalTrustResult } from "./renewal-contract-types";

export function scoreRenewalContractTrust(input: RenewalTrustInput): RenewalTrustResult {
  let score = 35;
  const reasons: string[] = [];
  const add = (condition: boolean, points: number, yes: string, no: string) => { if (condition) { score += points; reasons.push(yes); } else reasons.push(no); };
  add(input.ownerKnown, 15, "Contract owner is known.", "Contract owner is missing.");
  add(input.renewalDateKnown, 15, "Renewal date is known.", "Renewal date is missing.");
  add(input.annualCostKnown, 15, "Annual cost is known.", "Annual cost is missing.");
  add(input.assignedUsersKnown, 10, "Assigned users are known.", "Assigned users are missing.");
  add(input.activeUsersKnown, 10, "Active users are known.", "Active users are missing.");
  add(input.utilisationKnown, 10, "Utilisation is known.", "Utilisation is missing.");
  add(input.duplicateDataKnown, 10, "Duplicate vendor data is known.", "Duplicate vendor data is missing.");
  add(input.evidenceRefsAvailable, 10, "Evidence references are available.", "Evidence references are missing.");
  const trustScore = Math.min(100, score);
  const trustBand = trustScore >= 85 ? "HIGH" : trustScore >= 65 ? "MEDIUM" : trustScore >= 45 ? "LOW" : "BLOCKED";
  return { trustScore, trustBand, reasons };
}
