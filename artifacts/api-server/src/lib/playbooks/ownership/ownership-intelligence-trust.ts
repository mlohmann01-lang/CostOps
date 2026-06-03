import type { OwnershipTrustInput, OwnershipTrustResult } from "./ownership-intelligence-types";

export function scoreOwnershipTrust(input: OwnershipTrustInput): OwnershipTrustResult {
  let score = 30;
  const reasons: string[] = [];
  const add = (ok:boolean, points:number, yes:string, no:string) => { if (ok) { score += points; reasons.push(yes); } else reasons.push(no); };
  add(input.businessOwnerKnown, 15, "Business owner is known.", "Business owner is missing.");
  add(input.technicalOwnerKnown, 10, "Technical owner is known.", "Technical owner is missing.");
  add(input.budgetOwnerKnown, 10, "Budget owner is known.", "Budget owner is missing.");
  add(input.renewalOwnerKnown, 10, "Renewal owner is known.", "Renewal owner is missing.");
  add(input.executiveSponsorKnown, 10, "Executive sponsor is known.", "Executive sponsor is missing.");
  add(input.costCentreKnown, 10, "Cost centre is known.", "Cost centre is missing.");
  add(input.ownerRecentlyConfirmed, 10, "Owner was recently confirmed.", "Owner confirmation is stale or missing.");
  add(input.evidenceRefsAvailable, 10, "Evidence references are available.", "Evidence references are missing.");
  add(input.sourceContextAvailable, 10, "Source context is available.", "Source context is missing.");
  const trustScore = Math.min(100, score);
  const trustBand = trustScore >= 85 ? "HIGH" : trustScore >= 65 ? "MEDIUM" : trustScore >= 45 ? "LOW" : "BLOCKED";
  return { trustScore, trustBand, reasons };
}
