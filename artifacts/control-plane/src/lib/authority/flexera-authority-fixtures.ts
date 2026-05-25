import type { FlexeraAuthoritySignal, FlexeraEntitlementEvidence } from './flexera-authority-types'
export const FLEXERA_EVIDENCE: FlexeraEntitlementEvidence[] = [{ tenantId:'demo-tenant', sourceSystem:'Flexera', applicationName:'Microsoft 365 E3', publisher:'Microsoft', sku:'M365-E3', entitlementCount:500, consumedCount:406, availableCount:94, licensePosition:'OVER_LICENSED', usageSignal:'inactive-seats-confirmed', confidence:0.91, lastUpdated:new Date().toISOString(), sourceOfTruth:'demo-authority', isSynthetic:true, metadata:{ note:'Synthetic entitlement signal' } }]
export const FLEXERA_SIGNALS: FlexeraAuthoritySignal[] = [
{ recommendationId:'ga-003', baseConfidence:76, adjustedConfidence:91, reason:'Confidence +15% from Flexera entitlement confirmation.' },
{ recommendationId:'ga-002', baseConfidence:76, adjustedConfidence:62, reason:'Blocked: Flexera entitlement position conflicts with M365 assignment evidence.' },
]
