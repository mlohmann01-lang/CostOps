export type CanonicalPlatformState =
  | 'UNKNOWN'
  | 'DISCOVERED'
  | 'UNDER_REVIEW'
  | 'GOVERNED'
  | 'APPROVAL_REQUIRED'
  | 'EXECUTION_ELIGIBLE'
  | 'EXECUTED'
  | 'VERIFIED'
  | 'DRIFT_DETECTED'
  | 'BLOCKED'
  | 'QUARANTINED'

export interface EvidenceLineage {
  evidenceId: string
  sourceSystem: string
  observedAt: string
  confidenceScore: number
  trustScore: number
  policyResult: 'PASSED' | 'WARNING' | 'FAILED' | 'BLOCKED'
  lineage: string[]
}

export interface ConnectorHealth extends EvidenceLineage { id: string; name: string; state: CanonicalPlatformState; health: 'HEALTHY'|'DEGRADED'|'UNAVAILABLE'|'BLOCKED'; lastSyncAt?: string }
export interface TrustGate extends EvidenceLineage { id: string; label: string; state: CanonicalPlatformState; blocker?: string }
export interface GovernanceProof extends EvidenceLineage { id: string; state: CanonicalPlatformState; trustBlockers: string[]; sourceConflicts: string[]; policyViolations: string[] }
export interface ExecutionAction extends EvidenceLineage { id: string; title: string; state: CanonicalPlatformState; executionEligibility: 'ELIGIBLE'|'INELIGIBLE'; approvalStatus: 'NOT_REQUIRED'|'PENDING'|'APPROVED'|'REJECTED'; dryRunResult: 'PASS'|'WARN'|'FAIL'; blastRadius: 'LOW'|'MEDIUM'|'HIGH'; rollbackReadiness: 'READY'|'PARTIAL'|'UNAVAILABLE'; verificationState: CanonicalPlatformState }
export interface OutcomeLedgerEntry extends EvidenceLineage { id: string; title: string; status: 'PROJECTED'|'APPROVED'|'EXECUTED'|'VERIFIED'|'DRIFTED'|'REVERSED'; state: CanonicalPlatformState }
export interface DriftEvent extends EvidenceLineage { id: string; title: string; severity: 'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'; state: CanonicalPlatformState }
export interface Recommendation extends EvidenceLineage { id: string; title: string; state: CanonicalPlatformState; opportunityType: string; recurrenceRisk: 'LOW'|'MEDIUM'|'HIGH' }
export interface ForecastFinding extends EvidenceLineage { id: string; title: string; state: CanonicalPlatformState; forecastConfidence: number; sourceCoverage: number; optimisationScenario: string; graphReference: string }
export interface OperationalGraphNode extends EvidenceLineage { id: string; label: string; state: CanonicalPlatformState; nodeType: string }
export interface OperationalGraphEdge extends EvidenceLineage { id: string; from: string; to: string; state: CanonicalPlatformState; edgeType: string }
