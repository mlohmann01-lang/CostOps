export type CertificationLevel="UNVERIFIED"|"LOW_CONFIDENCE"|"GOVERNED"|"CERTIFIED"|"HIGH_ASSURANCE";
export type ExecutionCertificationClass='EXECUTION_PROHIBITED'|'GOVERNANCE_REVIEW_REQUIRED'|'GOVERNANCE_APPROVAL_REQUIRED'|'GOVERNANCE_EXECUTION_CERTIFIED';
export interface ExecutionCertificationInput{contradictionPresent:boolean;lineageIntegrity:number;evidenceIntegrity:number;reversibility:number;governanceDrift:number;blastRadius:number;trustScore:number;}
