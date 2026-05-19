import type { EconomicDomain, EconomicEvidenceReference } from '../economic-intelligence-kernel';
export interface EconomicMemoryRecord{tenantId:string;domain:EconomicDomain;category:string;timestamp:string;savingsDelta:number;evidenceReferences:EconomicEvidenceReference[];approved:boolean;}
export interface EconomicRecurrencePattern{category:string;count:number;recurrenceRisk:number;}
export interface EconomicPatternMemory{patterns:EconomicRecurrencePattern[];}
export interface EconomicMemoryReport{recurrenceRisk:number;reviewMode:'READ_ONLY'|'RECOMMEND_ONLY'|'APPROVAL_REQUIRED';driftEvents:string[];}
