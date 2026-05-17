export type AtlassianTrustBand = "HIGH"|"MEDIUM"|"LOW"|"QUARANTINED";
export type AtlassianUsageConfidence = "HIGH"|"MEDIUM"|"LOW"|"UNKNOWN_USAGE_CONFIDENCE";

export type AtlassianEvidenceInput = {
  tenantId: string; siteId?: string|null; email?: string; productType?: string; managedAccount?: boolean|null;
  lastActivityAt?: string|null; adminRole?: string|null; groupMemberships?: string[]|null; marketplaceAssignments?: string[]|null;
  contractorFlag?: boolean|null; usageConfidence?: string|null; identityConfidence?: number|null; entitlementConfidence?: number|null;
  entitlementSource?: string|null; owner?: string|null; duplicateIdentity?: boolean; sharedMailbox?: boolean;
};

export type AtlassianNormalizedEvidence = {
  tenantId: string; domain: "ATLASSIAN"; siteId: string;
  user: { email: string; managedAccount: boolean; contractorFlag: boolean; productType: string; adminRole: string|null; groupMemberships: string[]; marketplaceAssignments: string[]; };
  usageSignal: { lastActivityAt: string|null; usageConfidence: AtlassianUsageConfidence };
  entitlement: { entitlementSource: string; entitlementConfidence: number };
  identity: { identityConfidence: number; duplicateIdentity: boolean; sharedMailbox: boolean };
  recommendationContext: { unknownActivity: boolean; unknownOwner: boolean; unknownGroupState: boolean; unknownSiteMapping: boolean; unknownUsageConfidence: boolean; unknownEntitlementSource: boolean; owner: string };
};
