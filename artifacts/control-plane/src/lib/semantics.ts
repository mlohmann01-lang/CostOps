import type { CanonicalPlatformState, EvidenceLineage } from '../types/platformSemantics'

export const canonicalStates: CanonicalPlatformState[] = ['UNKNOWN','DISCOVERED','UNDER_REVIEW','GOVERNED','APPROVAL_REQUIRED','EXECUTION_ELIGIBLE','EXECUTED','VERIFIED','DRIFT_DETECTED','BLOCKED','QUARANTINED']

export function seededLineage(seed: string): EvidenceLineage {
  return {
    evidenceId: `ev-${seed}`,
    sourceSystem: 'CERTEN_RUNTIME',
    observedAt: '2026-05-01T09:00:00.000Z',
    confidenceScore: 0.88,
    trustScore: 0.84,
    policyResult: 'PASSED',
    lineage: [`connector:${seed}`, `governance:${seed}`, `execution:${seed}`],
  }
}

export function mapToCanonicalState(status: string): CanonicalPlatformState {
  const s = status.toUpperCase()
  if (s.includes('DRIFT')) return 'DRIFT_DETECTED'
  if (s.includes('BLOCK')) return 'BLOCKED'
  if (s.includes('VERIFY')) return 'VERIFIED'
  if (s.includes('EXECUT')) return 'EXECUTED'
  if (s.includes('ELIGIBLE') || s.includes('READY')) return 'EXECUTION_ELIGIBLE'
  if (s.includes('APPROVAL')) return 'APPROVAL_REQUIRED'
  if (s.includes('GOVERN')) return 'GOVERNED'
  if (s.includes('REVIEW')) return 'UNDER_REVIEW'
  if (s.includes('DISCOVER')) return 'DISCOVERED'
  return 'UNKNOWN'
}
