import { outcomeLedgerByPlaybook, outcomeLedgerByState } from './outcome-ledger'
import { outcomeProofService } from './outcome-proof-service'

export async function buildEconomicProofConsole(tenantId: string) {
  const [summary, byPlaybook, byState, proofs] = await Promise.all([
    outcomeProofService.getSummary(tenantId),
    outcomeLedgerByPlaybook(tenantId),
    outcomeLedgerByState(tenantId),
    outcomeProofService.listProofs(tenantId, { limit: 100 }),
  ])
  return {
    proofAuthority: 'OUTCOME_PROOF_AUTHORITY',
    proofLanguage: [
      'Projected savings',
      'Approved savings',
      'Executed savings',
      'Verified savings',
      'Retained savings',
      'Protected savings',
      'Savings variance',
      'Evidence-backed lifecycle',
      'Verification failed',
      'Drift detected',
      'Governance-controlled outcome',
    ],
    summary,
    proofs,
    byPlaybook,
    byState,
  }
}
