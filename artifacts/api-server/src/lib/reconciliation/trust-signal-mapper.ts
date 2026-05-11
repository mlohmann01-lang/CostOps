type TrustImpact = "NONE" | "WARNING" | "DOWNGRADE" | "BLOCK";

type FindingLite = { findingType: string };

export function mapTrustSignalsFromFindings(findings: FindingLite[]) {
  const identitySignals: unknown[] = [];
  const entitlementSignals: unknown[] = [];
  const ownershipSignals: unknown[] = [];
  const conflictSignals: unknown[] = [];
  let recommendedTrustImpact: TrustImpact = "NONE";

  for (const finding of findings) {
    if (finding.findingType === "IDENTITY_MATCH_CONFIRMED") identitySignals.push(finding);
    if (finding.findingType === "IDENTITY_CONFLICT") { conflictSignals.push(finding); recommendedTrustImpact = "BLOCK"; }
    if (finding.findingType === "ENTITLEMENT_CONFLICT") { entitlementSignals.push(finding); conflictSignals.push(finding); if (recommendedTrustImpact !== "BLOCK") recommendedTrustImpact = "DOWNGRADE"; }
    if (finding.findingType === "OWNERSHIP_MISSING" || finding.findingType === "COST_CENTER_MISMATCH") { ownershipSignals.push(finding); if (recommendedTrustImpact === "NONE") recommendedTrustImpact = "WARNING"; }
  }

  return { identitySignals, entitlementSignals, ownershipSignals, conflictSignals, recommendedTrustImpact };
}
