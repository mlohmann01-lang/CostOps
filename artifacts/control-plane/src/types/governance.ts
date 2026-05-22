export type Verdict =
  | 'GOVERNED_EXECUTION_ELIGIBLE'
  | 'APPROVAL_REQUIRED'
  | 'MANUAL_ONLY'
  | 'NEVER_ELIGIBLE'

export type BlastRadius = 'LOW' | 'MEDIUM' | 'HIGH'

export type RollbackClass = 'FULL' | 'PARTIAL' | 'NONE'

export interface ProofStep {
  id: string
  label: string
  detail: string
  status: 'PASS' | 'WARN' | 'FAIL'
  proofHash: string | null
}

export interface GovernanceAction {
  id: string
  name: string
  description: string
  domain: string
  savingAmount: number
  verdict: Verdict
  blastRadius: BlastRadius
  rollback: RollbackClass
  certId: string | null
  proofChain: ProofStep[]
}

export interface AuditEntry {
  id: string
  timestamp: string
  action: string
  verdict: Verdict
  domain: string
  certId: string | null
  actorId: string
}

export interface ExecutionRecord {
  id: string
  name: string
  domain: string
  approvedBy: string
  approvedAt: string
  executedAt: string | null
  blastRadius: BlastRadius
  rollback: RollbackClass
  savingRealised: number | null
  certId: string
  status: 'QUEUED' | 'EXECUTING' | 'COMPLETED' | 'ROLLED_BACK'
}
