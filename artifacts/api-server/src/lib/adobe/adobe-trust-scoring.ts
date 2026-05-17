import type { AdobeNormalizedEvidence, TrustBand } from "./types";
export function scoreAdobeTrust(e: AdobeNormalizedEvidence): { trustBand: TrustBand; reasons: string[] } {
  const reasons: string[] = []; let score = 100;
  if (e.user.identityType === "UNKNOWN_IDENTITY_TYPE") { score -= 40; reasons.push("UNKNOWN_IDENTITY_TYPE"); }
  if (e.usageSignal.usageConfidence === "UNKNOWN_USAGE_CONFIDENCE") { score -= 30; reasons.push("UNKNOWN_USAGE_CONFIDENCE"); }
  if (e.account.owner === "UNKNOWN_OWNER") { score -= 20; reasons.push("UNKNOWN_OWNER"); }
  if (e.user.contractorFlag && !e.user.federatedIdentity) { score -= 20; reasons.push("CONTRACTOR_UNCERTAINTY"); }
  const trustBand: TrustBand = score < 25 ? "QUARANTINED" : score < 50 ? "LOW" : score < 80 ? "MEDIUM" : "HIGH";
  return { trustBand, reasons };
}
