export type ProvenanceClass="SYNTHETIC"|"INDUSTRY_GUIDANCE"|"EMPIRICAL_REPLAY"|"BENCHMARK_DERIVED"|"OPERATIONAL_OBSERVATION"|"GOVERNANCE_ASSUMPTION";
export type EvidenceGrade="LOW"|"MODERATE"|"HIGH"|"VERIFIED";
export interface CoefficientProvenance {id:string;provenance:ProvenanceClass;evidenceGrade:EvidenceGrade;confidence:number;validUntil:string;sources:string[];}
