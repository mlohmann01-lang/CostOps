export type LicensePosition = 'OPTIMIZED'|'OVER_LICENSED'|'UNDER_LICENSED'|'UNKNOWN'|'CONFLICTING'
export interface FlexeraEntitlementEvidence { tenantId:string; sourceSystem:string; applicationName:string; publisher:string; sku:string; entitlementCount:number; consumedCount:number; availableCount:number; licensePosition:LicensePosition; usageSignal:string; confidence:number; lastUpdated:string; sourceOfTruth:string; isSynthetic:boolean; metadata:Record<string,string> }
export interface FlexeraLicensePositionEvidence extends FlexeraEntitlementEvidence {}
export interface FlexeraUsageEvidence extends FlexeraEntitlementEvidence {}
export interface FlexeraMismatchFinding extends FlexeraEntitlementEvidence { mismatchReason:string }
export interface FlexeraAuthoritySignal { recommendationId:string; baseConfidence:number; adjustedConfidence:number; reason:string; finding?:FlexeraMismatchFinding }
