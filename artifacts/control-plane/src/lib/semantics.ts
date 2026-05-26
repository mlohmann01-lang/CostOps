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
  if (s.includes('QUARANTIN')) return 'QUARANTINED'
  if (s.includes('BLOCK')) return 'BLOCKED'
  if (s.includes('VERIF')) return 'VERIFIED'
  if (s.includes('ELIGIBLE') || s.includes('READY')) return 'EXECUTION_ELIGIBLE'
  if (s.includes('EXECUT')) return 'EXECUTED'
  if (s.includes('APPROVAL')) return 'APPROVAL_REQUIRED'
  if (s.includes('GOVERN')) return 'GOVERNED'
  if (s.includes('REVIEW')) return 'UNDER_REVIEW'
  if (s.includes('DISCOVER')) return 'DISCOVERED'
  return 'UNKNOWN'
}

export function trustScoreBand(score: number): 'AUTO_EXECUTE' | 'APPROVAL_REQUIRED' | 'INVESTIGATE' | 'BLOCKED' {
  if (score >= 0.90) return 'AUTO_EXECUTE'
  if (score >= 0.75) return 'APPROVAL_REQUIRED'
  if (score >= 0.50) return 'INVESTIGATE'
  return 'BLOCKED'
}

export function policyResultFromState(state: CanonicalPlatformState): EvidenceLineage['policyResult'] {
  if (state === 'BLOCKED' || state === 'QUARANTINED') return 'BLOCKED'
  if (state === 'DRIFT_DETECTED' || state === 'UNDER_REVIEW') return 'WARNING'
  if (state === 'UNKNOWN') return 'FAILED'
  return 'PASSED'
}

export function executionEligibilityFromState(state: CanonicalPlatformState): 'ELIGIBLE' | 'INELIGIBLE' {
  return state === 'EXECUTION_ELIGIBLE' || state === 'GOVERNED' ? 'ELIGIBLE' : 'INELIGIBLE'
}
