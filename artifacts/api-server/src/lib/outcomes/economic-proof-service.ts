import { outcomeLedgerByPlaybook, outcomeLedgerByState, outcomeLedgerSummary } from './outcome-ledger';

export async function buildEconomicProofConsole(tenantId: string) {
  const [summary, byPlaybook, byState] = await Promise.all([
    outcomeLedgerSummary(tenantId),
    outcomeLedgerByPlaybook(tenantId),
    outcomeLedgerByState(tenantId),
  ]);
  return {
    proofLanguage: [
      'Verified savings',
      'Projected savings',
      'Savings variance',
      'Evidence-backed',
      'Verification failed',
      'Drift detected',
      'Pending verification',
      'Governance-controlled outcome',
    ],
    summary,
    byPlaybook,
    byState,
  };
}
