export type VerificationStatus = 'VERIFIED' | 'FAILED' | 'PENDING'

export interface M365LicenseVerificationInput {
  tenantId: string
  userId: string
  skuId: string
  beforeAssignedSkuIds: string[]
  currentAssignedSkuIds?: string[]
  currentLicenseDetailSkuIds?: string[]
  refreshedSnapshotAssignedSkuIds?: string[]
  projectedMonthlySavings: number
  evidenceRefs?: string[]
}

export interface VerificationResult {
  status: VerificationStatus
  confidenceBand: 'HIGH' | 'MEDIUM' | 'LOW'
  evidenceRefs: string[]
  verifiedMonthlySavings: number
  verifiedAnnualSavings: number
  blockers: string[]
}

export class M365LicenseVerificationService {
  async verify(input: M365LicenseVerificationInput): Promise<VerificationResult> {
    const refs = [...(input.evidenceRefs ?? [])]
    const blockers: string[] = []
    if (!input.beforeAssignedSkuIds.includes(input.skuId)) blockers.push('Before-state evidence did not contain the license.')

    const sources = [
      { name: 'assignedLicenses', value: input.currentAssignedSkuIds },
      { name: 'licenseDetails', value: input.currentLicenseDetailSkuIds },
      { name: 'snapshotRefresh', value: input.refreshedSnapshotAssignedSkuIds },
    ].filter((source): source is { name: string; value: string[] } => Array.isArray(source.value))

    if (sources.length === 0) {
      return { status: 'PENDING', confidenceBand: 'LOW', evidenceRefs: [...refs, 'verification:missing-readback'], verifiedMonthlySavings: 0, verifiedAnnualSavings: 0, blockers: ['Verification readback evidence is required.'] }
    }

    for (const source of sources) {
      refs.push(`verification:${source.name}`)
      if (source.value.includes(input.skuId)) blockers.push(`${source.name} still contains the removed license.`)
    }

    if (blockers.length) return { status: 'FAILED', confidenceBand: 'LOW', evidenceRefs: refs, verifiedMonthlySavings: 0, verifiedAnnualSavings: 0, blockers }
    const confidenceBand = sources.length >= 2 ? 'HIGH' : 'MEDIUM'
    return { status: 'VERIFIED', confidenceBand, evidenceRefs: refs, verifiedMonthlySavings: input.projectedMonthlySavings, verifiedAnnualSavings: input.projectedMonthlySavings * 12, blockers: [] }
  }
}

export const m365LicenseVerificationService = new M365LicenseVerificationService()
