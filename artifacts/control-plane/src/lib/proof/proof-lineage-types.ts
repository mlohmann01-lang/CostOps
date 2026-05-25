export type ProofNodeType = 'Evidence Source'|'Normalized Signal'|'Recommendation'|'Readiness Gate'|'Approval'|'Execution'|'Verification'|'Drift Monitor'|'Authority Evidence'|'Rollback'
export type ProofNodeStatus = 'Complete'|'Pending'|'Warning'|'Blocked'
export interface ProofLineageNode {
  id: string
  type: ProofNodeType
  label: string
  status: ProofNodeStatus
  source: string
  confidence: number
  timestamp: string
  isSynthetic: boolean
  isEstimated: boolean
  authorityType: 'Usage evidence'|'Cost evidence'|'Entitlement evidence'|'License position evidence'|'Approval evidence'|'Execution evidence'|'Verification evidence'|'Drift evidence'
  description: string
  children: ProofLineageNode[]
}
