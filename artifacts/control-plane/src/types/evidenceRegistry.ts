export type EvidenceRegistryReadiness='READY'|'PARTIAL'|'MISSING_DATA'|'BLOCKED'|'DEMO';
export interface EvidenceRecord{id:string;evidenceRef:string;title:string;evidenceType:string;sourceSystem:string;targetType:string;targetId:string;status:string;classification:string;trustLevel:string;redactionStatus:string;expiresAt?:string;artifactIds:string[];metadata:Record<string,unknown>}
export interface EvidenceRegistrySnapshot{generatedAt:string;evidenceCount:number;validatedCount:number;missingCount:number;failedCount:number;expiredCount:number;redactionPendingCount:number;restrictedCount:number;evidenceCoverageScore:number;integrityScore:number;provenanceScore:number;criticalGaps:Array<{targetType:string;targetId:string;reason:string;severity:string}>;readiness:EvidenceRegistryReadiness}
export interface EvidenceChain{record?:EvidenceRecord;artifacts:any[];links:any[];provenance:any[];integrityChecks:any[];lifecycleEvents:any[];exports:any[]}
export interface EvidenceRegistryState{mode:'DEMO'|'LIVE';snapshot:EvidenceRegistrySnapshot|null;records:EvidenceRecord[];selectedChain?:EvidenceChain|null;unavailable:boolean;demoLabel?:string}
export const notAvailable='Not available';
