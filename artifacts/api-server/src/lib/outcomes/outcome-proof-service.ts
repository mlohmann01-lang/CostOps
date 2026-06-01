import { desc, eq } from 'drizzle-orm'
import { db, executionOutcomesTable, outcomeLedgerTable, outcomeVerificationsTable } from '@workspace/db'
import { platformEventService } from '../events/platform-event-service'
import type { OutcomeProof, OutcomeProofFilters, OutcomeProofInput, OutcomeProofState, OutcomeProofSummary } from './outcome-proof-types'
import { buildBaseProof, mergeProofs, proofFromApproval, proofFromDrift, proofFromExecutionResult, proofFromLedgerRow, proofFromRecommendation, proofFromVerification } from './outcome-proof-projection'

const allowMemory = () => ['test', 'development'].includes(String(process.env.RUNTIME_ENV ?? process.env.NODE_ENV ?? 'development').toLowerCase())

type ProofSource = 'recommendation' | 'approval' | 'execution' | 'verification' | 'drift' | 'manual'

function eventFor(state: OutcomeProofState) {
  if (state === 'PROJECTED') return 'OUTCOME_PROOF_PROJECTED'
  if (state === 'APPROVED') return 'OUTCOME_PROOF_APPROVED'
  if (state === 'EXECUTED') return 'OUTCOME_PROOF_EXECUTED'
  if (state === 'VERIFIED') return 'OUTCOME_PROOF_VERIFIED'
  if (state === 'RETAINED') return 'OUTCOME_PROOF_RETAINED'
  if (state === 'PROTECTED') return 'OUTCOME_PROOF_PROTECTED'
  if (state === 'DRIFTED') return 'OUTCOME_PROOF_DRIFTED'
  if (state === 'FAILED') return 'OUTCOME_PROOF_FAILED'
  return 'OUTCOME_PROOF_UPDATED'
}

function aliasKeys(proof: OutcomeProof) {
  return [
    proof.outcomeId && `outcome:${proof.outcomeId}`,
    proof.recommendationId && `recommendation:${proof.recommendationId}`,
    proof.opportunityId && `opportunity:${proof.opportunityId}`,
    proof.executionRequestId && `execution-request:${proof.executionRequestId}`,
    proof.executionResultId && `execution-result:${proof.executionResultId}`,
    proof.verificationId && `verification:${proof.verificationId}`,
    proof.approvalWorkflowId && `approval-workflow:${proof.approvalWorkflowId}`,
  ].filter(Boolean) as string[]
}

function summaryBand(proofs: OutcomeProof[]) {
  if (proofs.some((proof) => proof.confidenceBand === 'FAILED')) return 'FAILED'
  if (!proofs.length) return 'LOW'
  const score = proofs.reduce((sum, proof) => sum + (proof.confidenceBand === 'HIGH' ? 3 : proof.confidenceBand === 'MEDIUM' ? 2 : 1), 0) / proofs.length
  return score >= 2.5 ? 'HIGH' : score >= 1.5 ? 'MEDIUM' : 'LOW'
}

export class OutcomeProofService {
  private readonly proofs = new Map<string, OutcomeProof>()
  private readonly aliases = new Map<string, string>()
  private readonly emitted = new Set<string>()

  clearForTests() {
    this.proofs.clear()
    this.aliases.clear()
    this.emitted.clear()
  }

  private scoped(tenantId: string, key: string) { return `${tenantId}:${key}` }
  private storeKey(tenantId: string, outcomeId: string) { return this.scoped(tenantId, `outcome:${outcomeId}`) }

  private existingKey(tenantId: string, proof: OutcomeProof) {
    for (const alias of aliasKeys(proof)) {
      const found = this.aliases.get(this.scoped(tenantId, alias))
      if (found) return found
    }
    return this.storeKey(tenantId, proof.outcomeId)
  }

  private index(proof: OutcomeProof) {
    const key = this.storeKey(proof.tenantId, proof.outcomeId)
    for (const alias of aliasKeys(proof)) this.aliases.set(this.scoped(proof.tenantId, alias), key)
  }

  private emit(tenantId: string, proof: OutcomeProof, source: ProofSource, previous?: OutcomeProof) {
    const eventType = previous && previous.proofState === proof.proofState ? 'OUTCOME_PROOF_UPDATED' : eventFor(proof.proofState)
    const eventId = `${proof.outcomeId}:${eventType}:${proof.proofState}`
    const scoped = this.scoped(tenantId, eventId)
    if (this.emitted.has(scoped)) return
    this.emitted.add(scoped)
    void platformEventService.recordOutcomeEvent(tenantId, eventType, { eventId, entityType: 'OUTCOME_PROOF', entityId: proof.outcomeId, actorId: 'system', title: `Outcome proof ${proof.proofState.toLowerCase()}`, description: `Outcome proof ${proof.proofState.toLowerCase()} via ${source}`, sourceSystem: 'outcome-proof-authority', metadata: { beforeState: previous?.proofState ?? 'NONE', afterState: proof.proofState, evidenceSummary: proof.evidenceSummary, proofTimeline: proof.proofTimeline }, occurredAt: proof.updatedAt }).catch(() => undefined)
  }

  async upsertProof(tenantId: string, proofInput: OutcomeProofInput, source: ProofSource = 'manual') {
    const incoming = buildBaseProof(tenantId, proofInput)
    const key = this.existingKey(tenantId, incoming)
    const previous = this.proofs.get(key)
    const merged = mergeProofs(previous, incoming)
    this.proofs.set(key, merged)
    this.index(merged)
    this.emit(tenantId, merged, source, previous)
    return merged
  }

  async projectFromRecommendation(tenantId: string, recommendation: any) {
    const proof = proofFromRecommendation(tenantId, recommendation)
    return this.upsertProof(tenantId, proof, 'recommendation')
  }

  async projectFromApproval(tenantId: string, approval: any) {
    const proof = proofFromApproval(tenantId, approval)
    return this.upsertProof(tenantId, proof, 'approval')
  }

  async projectFromExecutionResult(tenantId: string, executionResult: any) {
    const proof = proofFromExecutionResult(tenantId, executionResult)
    return this.upsertProof(tenantId, proof, 'execution')
  }

  async projectFromVerification(tenantId: string, verification: any) {
    const proof = proofFromVerification(tenantId, verification)
    return this.upsertProof(tenantId, proof, 'verification')
  }

  async projectFromDrift(tenantId: string, driftEvent: any) {
    const proof = proofFromDrift(tenantId, driftEvent)
    return this.upsertProof(tenantId, proof, 'drift')
  }

  private async persistedProofs(tenantId: string) {
    const proofs: OutcomeProof[] = []
    try {
      const rows = await db.select().from(outcomeLedgerTable).where(eq(outcomeLedgerTable.tenantId, tenantId)).orderBy(desc(outcomeLedgerTable.createdAt)).limit(500)
      proofs.push(...rows.map((row: any) => proofFromLedgerRow(tenantId, row)))
    } catch (error) { if (!allowMemory()) throw error }
    try {
      const rows = await db.select().from(outcomeVerificationsTable).where(eq(outcomeVerificationsTable.tenantId, tenantId)).orderBy(desc(outcomeVerificationsTable.createdAt)).limit(500)
      proofs.push(...rows.map((row: any) => proofFromVerification(tenantId, row)))
    } catch (error) { if (!allowMemory()) throw error }
    try {
      const rows = await db.select().from(executionOutcomesTable).where(eq(executionOutcomesTable.tenantId, tenantId)).orderBy(desc(executionOutcomesTable.lastCheckedAt)).limit(500)
      proofs.push(...rows.map((row: any) => proofFromVerification(tenantId, row)))
    } catch (error) { if (!allowMemory()) throw error }
    return proofs
  }

  async listProofs(tenantId: string, filters: OutcomeProofFilters = {}) {
    const merged = new Map<string, OutcomeProof>()
    for (const proof of await this.persistedProofs(tenantId)) {
      const key = this.storeKey(tenantId, proof.outcomeId)
      merged.set(key, mergeProofs(merged.get(key), proof))
    }
    for (const [key, proof] of this.proofs.entries()) if (proof.tenantId === tenantId) merged.set(key, proof)
    let proofs = [...merged.values()]
    if (filters.proofState) proofs = proofs.filter((proof) => proof.proofState === filters.proofState)
    if (filters.recommendationId) proofs = proofs.filter((proof) => proof.recommendationId === filters.recommendationId)
    if (filters.opportunityId) proofs = proofs.filter((proof) => proof.opportunityId === filters.opportunityId)
    if (filters.executionRequestId) proofs = proofs.filter((proof) => proof.executionRequestId === filters.executionRequestId)
    if (filters.executionResultId) proofs = proofs.filter((proof) => proof.executionResultId === filters.executionResultId)
    if (filters.verificationId) proofs = proofs.filter((proof) => proof.verificationId === filters.verificationId)
    return proofs.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, Math.min(Math.max(filters.limit ?? 500, 1), 500))
  }

  async getProof(tenantId: string, outcomeId: string) {
    const directKey = this.storeKey(tenantId, outcomeId)
    const aliasKey = this.aliases.get(this.scoped(tenantId, `outcome:${outcomeId}`))
    const key = aliasKey ?? directKey
    if (this.proofs.has(key)) return this.proofs.get(key) ?? null
    return (await this.listProofs(tenantId, { limit: 500 })).find((proof) => proof.outcomeId === outcomeId) ?? null
  }

  async getProofByExecutionResult(tenantId: string, executionResultId: string) {
    return (await this.listProofs(tenantId, { executionResultId, limit: 1 }))[0] ?? null
  }

  async buildProofTimeline(tenantId: string, proof: OutcomeProof) {
    const current = await this.getProof(tenantId, proof.outcomeId)
    return current?.proofTimeline ?? proof.proofTimeline
  }

  async getSummary(tenantId: string): Promise<OutcomeProofSummary> {
    const proofs = await this.listProofs(tenantId, { limit: 500 })
    const sum = (field: keyof OutcomeProof) => proofs.reduce((total, proof) => total + Number(proof[field] ?? 0), 0)
    return {
      tenantId,
      projectedMonthlySavings: sum('projectedMonthlySavings'),
      approvedMonthlySavings: sum('approvedMonthlySavings'),
      executedMonthlySavings: sum('executedMonthlySavings'),
      verifiedMonthlySavings: sum('verifiedMonthlySavings'),
      retainedMonthlySavings: sum('retainedMonthlySavings'),
      protectedMonthlySavings: sum('protectedMonthlySavings'),
      projectedAnnualSavings: sum('projectedAnnualSavings'),
      approvedAnnualSavings: sum('approvedAnnualSavings'),
      executedAnnualSavings: sum('executedAnnualSavings'),
      verifiedAnnualSavings: sum('verifiedAnnualSavings'),
      retainedAnnualSavings: sum('retainedAnnualSavings'),
      protectedAnnualSavings: sum('protectedAnnualSavings'),
      verificationBacklogCount: proofs.filter((proof) => !proof.evidenceSummary.hasVerificationEvidence && proof.proofState !== 'FAILED' && proof.proofState !== 'CLOSED').length,
      verificationFailedCount: proofs.filter((proof) => proof.proofState === 'FAILED' || proof.confidenceBand === 'FAILED').length,
      driftedOutcomeCount: proofs.filter((proof) => proof.proofState === 'DRIFTED').length,
      averageConfidenceBand: summaryBand(proofs),
      generatedAt: new Date().toISOString(),
    }
  }
}

export const outcomeProofService = new OutcomeProofService()
