import type { AtlassianNormalizedEvidence, AtlassianTrustBand } from './types';
export function scoreAtlassianTrust(e: AtlassianNormalizedEvidence): { trustBand: AtlassianTrustBand; reasons: string[] } {
  let score = 100; const reasons:string[]=[];
  if (!e.user.managedAccount) { score -= 20; reasons.push('UNMANAGED_ACCOUNT'); }
  if (e.identity.duplicateIdentity) { score -= 25; reasons.push('DUPLICATE_IDENTITY'); }
  if (e.identity.sharedMailbox) { score -= 20; reasons.push('SHARED_MAILBOX_SUSPECTED'); }
  if (e.usageSignal.usageConfidence === 'UNKNOWN_USAGE_CONFIDENCE') { score -= 25; reasons.push('UNKNOWN_USAGE_CONFIDENCE'); }
  if (e.recommendationContext.unknownEntitlementSource) { score -= 20; reasons.push('UNKNOWN_ENTITLEMENT_SOURCE'); }
  if (e.user.contractorFlag && e.recommendationContext.unknownOwner) { score -= 20; reasons.push('CONTRACTOR_OWNER_AMBIGUITY'); }
  const trustBand: AtlassianTrustBand = score < 25 ? 'QUARANTINED' : score < 50 ? 'LOW' : score < 80 ? 'MEDIUM' : 'HIGH';
  return { trustBand, reasons };
}
