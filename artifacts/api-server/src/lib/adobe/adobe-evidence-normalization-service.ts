import type { AdobeEvidenceInput, AdobeNormalizedEvidence } from "./types";
const asIdentityType = (v?: string): AdobeNormalizedEvidence["user"]["identityType"] => (v === "FEDERATED_ID" || v === "ADOBE_ID" || v === "ENTERPRISE_ID") ? v : "UNKNOWN_IDENTITY_TYPE";
const asUsageConfidence = (v?: string | null): AdobeNormalizedEvidence["usageSignal"]["usageConfidence"] => (v === "HIGH" || v === "MEDIUM" || v === "LOW") ? v : "UNKNOWN_USAGE_CONFIDENCE";
export class AdobeEvidenceNormalizationService {
  normalize(input: AdobeEvidenceInput): AdobeNormalizedEvidence {
    const email = (input.email ?? "unknown@unknown").toLowerCase();
    const entitlementSource = input.entitlementSource ?? "UNKNOWN_ENTITLEMENT_SOURCE";
    const owner = input.owner ?? "UNKNOWN_OWNER";
    return { tenantId: input.tenantId, domain: "ADOBE", user: { email, contractorFlag: Boolean(input.contractorFlag), identityType: asIdentityType(input.identityType), federatedIdentity: input.federatedIdentity ?? null }, account: { owner, adminRole: input.adminRole ?? null }, license: { assignedProducts: input.assignedProducts ?? [], entitlementSource }, usageSignal: { lastActivityAt: input.lastActivityAt ?? null, usageConfidence: asUsageConfidence(input.usageConfidence), storageConsumption: Number(input.storageConsumption ?? 0) }, recommendationContext: { unknownActivity: !input.lastActivityAt, unknownOwner: owner === "UNKNOWN_OWNER", unknownEntitlementSource: entitlementSource === "UNKNOWN_ENTITLEMENT_SOURCE" } };
  }
}
