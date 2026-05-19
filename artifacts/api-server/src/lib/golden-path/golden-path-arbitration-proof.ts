export const proveGoldenPathArbitrationIntegrity = (decision: { governanceRiskOverride: boolean; finalGovernanceClass: 'RECOMMEND_ONLY' | 'APPROVAL_REQUIRED' }): { ok: boolean; reason: string } => {
  if (decision.governanceRiskOverride && decision.finalGovernanceClass !== 'APPROVAL_REQUIRED') {
    return { ok: false, reason: 'governance override not enforced' };
  }
  return { ok: true, reason: 'deterministic governance arbitration integrity satisfied' };
};
