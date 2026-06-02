import type { EvidencePack, EvidencePackAuditBundle } from './evidence-pack-types'

export class ExecutiveSummaryGenerator {
  generate(pack: Pick<EvidencePack, 'summary'>) { return pack.summary }
}

export function generateEvidencePackJson(pack: EvidencePack) { return pack }
export function generateEvidencePackPdf(pack: EvidencePack) {
  const lines = ['Executive Evidence Pack', `Pack: ${pack.evidencePackId}`, `Tenant: ${pack.tenantId}`, `Scope: ${pack.scope}`, '', 'Executive Summary', `Projected: ${pack.summary.projectedSavings}`, `Approved: ${pack.summary.approvedSavings}`, `Executed: ${pack.summary.executedSavings}`, `Verified: ${pack.summary.verifiedSavings}`, `Protected: ${pack.summary.protectedSavings}`, '', ...pack.sections.map((section) => `${section.title}\n${section.summary}`)]
  return Buffer.from(lines.join('\n\n'), 'utf8')
}
export function generateEvidencePackAuditBundle(input: EvidencePackAuditBundle) { return input }
