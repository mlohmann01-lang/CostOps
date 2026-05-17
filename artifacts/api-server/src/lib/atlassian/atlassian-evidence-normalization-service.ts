import type { AtlassianEvidenceInput, AtlassianNormalizedEvidence } from './types';
const asUsage=(v?:string|null):AtlassianNormalizedEvidence['usageSignal']['usageConfidence']=>(v==='HIGH'||v==='MEDIUM'||v==='LOW')?v:'UNKNOWN_USAGE_CONFIDENCE';
export class AtlassianEvidenceNormalizationService {
  normalize(input: AtlassianEvidenceInput): AtlassianNormalizedEvidence {
    const owner=input.owner??'UNKNOWN_OWNER';
    const entitlementSource=input.entitlementSource??'UNKNOWN_ENTITLEMENT_SOURCE';
    const siteId=input.siteId??'UNKNOWN_SITE_MAPPING';
    return { tenantId: input.tenantId, domain:'ATLASSIAN', siteId, user:{ email:(input.email??'unknown@unknown').toLowerCase(), managedAccount:Boolean(input.managedAccount), contractorFlag:Boolean(input.contractorFlag), productType: input.productType??'UNKNOWN_PRODUCT', adminRole: input.adminRole??null, groupMemberships: input.groupMemberships??['UNKNOWN_GROUP_STATE'], marketplaceAssignments: input.marketplaceAssignments??[] }, usageSignal:{ lastActivityAt:input.lastActivityAt??null, usageConfidence:asUsage(input.usageConfidence) }, entitlement:{ entitlementSource, entitlementConfidence:Number(input.entitlementConfidence??0.5) }, identity:{ identityConfidence:Number(input.identityConfidence??0.5), duplicateIdentity:Boolean(input.duplicateIdentity), sharedMailbox:Boolean(input.sharedMailbox) }, recommendationContext:{ unknownActivity:!input.lastActivityAt, unknownOwner:owner==='UNKNOWN_OWNER', unknownGroupState:!input.groupMemberships, unknownSiteMapping:siteId==='UNKNOWN_SITE_MAPPING', unknownUsageConfidence:asUsage(input.usageConfidence)==='UNKNOWN_USAGE_CONFIDENCE', unknownEntitlementSource:entitlementSource==='UNKNOWN_ENTITLEMENT_SOURCE', owner } };
  }
}
