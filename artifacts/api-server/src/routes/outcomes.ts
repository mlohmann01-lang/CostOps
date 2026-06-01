import { Router } from "express";
import { db } from "@workspace/db";
import { outcomeLedgerTable, outcomeVerificationsTable } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";
import { buildEconomicProofConsole } from "../lib/outcomes/economic-proof-service";
import { listOutcomeLedger, outcomeLedgerByPlaybook, outcomeLedgerByState, outcomeLedgerSummary } from "../lib/outcomes/outcome-ledger";
import { verifyOutcome } from "../lib/outcomes/outcome-verification-engine";
import { outcomeProofService } from "../lib/outcomes/outcome-proof-service";

const router = Router();

function tenantIdFrom(req: any) {
  return String(req.tenantId ?? req.query.tenantId ?? "default");
}

async function getOutcomeForTenant(outcomeId: string, tenantId: string) {
  const numeric = Number(outcomeId);
  const [outcome] = await db.select().from(outcomeLedgerTable).where(and(eq(outcomeLedgerTable.id, numeric), eq(outcomeLedgerTable.tenantId, tenantId))).limit(1);
  return outcome ?? null;
}

async function latestVerification(tenantId: string, outcomeLedgerId: number) {
  const [row] = await db.select().from(outcomeVerificationsTable).where(and(eq(outcomeVerificationsTable.tenantId, tenantId), eq(outcomeVerificationsTable.outcomeLedgerId, outcomeLedgerId))).orderBy(desc(outcomeVerificationsTable.createdAt)).limit(1);
  return row ?? null;
}

function verificationAge(createdAt?: Date | null) {
  if (!createdAt) return null;
  const hours = Math.max(0, Math.round((Date.now() - createdAt.getTime()) / 36_000) / 100);
  return { hours, label: hours < 1 ? "just now" : `${hours}h old` };
}

router.get('/proof/summary', async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    return res.json(await outcomeProofService.getSummary(tenantId));
  } catch (err) {
    req.log.error({ err }, 'Error fetching outcome proof summary');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/proof', async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const proofs = await outcomeProofService.listProofs(tenantId, {
      proofState: req.query.proofState as any,
      recommendationId: req.query.recommendationId ? String(req.query.recommendationId) : undefined,
      opportunityId: req.query.opportunityId ? String(req.query.opportunityId) : undefined,
      executionRequestId: req.query.executionRequestId ? String(req.query.executionRequestId) : undefined,
      executionResultId: req.query.executionResultId ? String(req.query.executionResultId) : undefined,
      verificationId: req.query.verificationId ? String(req.query.verificationId) : undefined,
      limit: Number(req.query.limit ?? 200),
    });
    return res.json({ tenantId, proofs, outcomes: proofs });
  } catch (err) {
    req.log.error({ err }, 'Error fetching outcome proofs');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/proof/:outcomeId', async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const proof = await outcomeProofService.getProof(tenantId, String(req.params.outcomeId));
    if (!proof) return res.status(404).json({ error: 'OUTCOME_PROOF_NOT_FOUND' });
    return res.json(proof);
  } catch (err) {
    req.log.error({ err }, 'Error fetching outcome proof');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger', async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? 'default');
    const limit = Math.min(parseInt(String(req.query.limit ?? '100')) || 100, 500);
    const rows = await listOutcomeLedger(tenantId, limit);
    return res.json((rows as any[]).map((row) => ({ ...row, verificationConfidence: row.proof?.confidenceBand ?? row.savingConfidence, verificationStatus: row.proof?.proofState ?? row.executionStatus, verifiedMonthlySavings: row.proof?.verifiedMonthlySavings ?? row.evidence?.verifiedSaving ?? 0, savingsVariance: row.proof?.savingsVarianceMonthly ?? 0, evidencePack: { sourceOfTruth: 'OUTCOME_PROOF_AUTHORITY', evidenceSummary: row.proof?.evidenceSummary, proofTimeline: row.proof?.proofTimeline, supportingEvidence: row.evidence }, verificationAge: verificationAge(row.executedAt ?? row.createdAt) })));
  } catch (err) {
    req.log.error({ err }, 'Error fetching outcome ledger');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger/summary', async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? 'default');
    return res.json(await outcomeLedgerSummary(tenantId));
  } catch (err) {
    req.log.error({ err }, 'Error fetching ledger summary');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger/by-playbook', async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? 'default');
    return res.json(await outcomeLedgerByPlaybook(tenantId));
  } catch (err) {
    req.log.error({ err }, 'Error fetching ledger by playbook');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger/by-state', async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId ?? 'default');
    return res.json(await outcomeLedgerByState(tenantId));
  } catch (err) {
    req.log.error({ err }, 'Error fetching ledger by state');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/ledger/proof-console', async (req,res)=>{
  const tenantId = String(req.query.tenantId ?? 'default');
  return res.json(await buildEconomicProofConsole(tenantId));
});


router.get('/unverified', async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const proofs = await outcomeProofService.listProofs(tenantId, { limit: 500 });
    const pending = proofs.filter((proof) => !proof.evidenceSummary.hasVerificationEvidence || proof.proofState === 'FAILED');
    return res.json({ tenantId, count: pending.length, projectedValuePendingProof: pending.reduce((sum, proof) => sum + proof.projectedMonthlySavings, 0), verificationFailures: pending.filter((proof) => proof.proofState === 'FAILED').length, outcomes: pending });
  } catch (err) {
    req.log.error({ err }, 'Error listing unverified outcomes');
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/evidence', async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const proof = await outcomeProofService.getProof(tenantId, String(req.params.id));
  if (proof) return res.json({ sourceOfTruth: 'OUTCOME_PROOF_AUTHORITY', evidenceSummary: proof.evidenceSummary, proofTimeline: proof.proofTimeline, evidencePackId: proof.evidencePackId });
  const outcome = await getOutcomeForTenant(String(req.params.id), tenantId);
  if (!outcome) return res.status(404).json({ error: 'OUTCOME_NOT_FOUND' });
  const verification = verifyOutcome(outcome);
  return res.json(verification.evidencePack);
});

router.get('/:id/verification', async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const outcome = await getOutcomeForTenant(String(req.params.id), tenantId);
  if (!outcome) return res.status(404).json({ error: 'OUTCOME_NOT_FOUND' });
  const computed = verifyOutcome(outcome);
  const persisted = await latestVerification(tenantId, outcome.id);
  return res.json({ ...computed, persistedVerification: persisted, verificationAge: verificationAge(persisted?.createdAt ?? null) });
});

router.post('/:id/reverify', async (req, res) => {
  const tenantId = tenantIdFrom(req);
  const outcome = await getOutcomeForTenant(String(req.params.id), tenantId);
  if (!outcome) return res.status(404).json({ error: 'OUTCOME_NOT_FOUND' });
  const computed = verifyOutcome(outcome);
  const [record] = await db.insert(outcomeVerificationsTable).values({
    tenantId,
    outcomeLedgerId: outcome.id,
    recommendationId: String(outcome.recommendationId),
    verificationStatus: computed.verificationStatus,
    verificationConfidence: computed.verificationConfidence,
    verificationSource: computed.verificationMethod,
    projectedMonthlySaving: computed.projectedMonthlySaving,
    verifiedMonthlySaving: computed.verifiedMonthlySaving,
    varianceAmount: computed.varianceAmount,
    variancePct: computed.variancePct,
    evidence: computed.evidencePack,
  }).returning();
  await outcomeProofService.projectFromVerification(tenantId, { ...record, outcomeId: String(outcome.id), recommendationId: String(outcome.recommendationId), verificationStatus: computed.verificationStatus, verificationConfidence: computed.verificationConfidence, projectedMonthlySaving: computed.projectedMonthlySaving, verifiedMonthlySaving: computed.verifiedMonthlySaving, varianceAmount: computed.varianceAmount });
  return res.status(201).json({ ...computed, persistedVerification: record, verificationAge: verificationAge(record.createdAt) });
});

router.get("/", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const rows = await listOutcomeLedger(tenantId, Math.min(parseInt(req.query.limit as string) || 50, 200));
    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error listing outcomes");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/summary", async (req, res) => {
  try {
    const tenantId = tenantIdFrom(req);
    const summary = await outcomeProofService.getSummary(tenantId);
    return res.json({
      ...summary,
      totalMonthlySaving: Math.round(summary.verifiedMonthlySavings * 100) / 100,
      totalAnnualisedSaving: Math.round(summary.verifiedAnnualSavings * 100) / 100,
      totalActionsExecuted: summary.executedMonthlySavings ? Math.max(1, summary.verificationBacklogCount + summary.verificationFailedCount) : 0,
      topPlaybook: "OUTCOME_PROOF_AUTHORITY",
      avgMonthlySavingPerAction: summary.executedMonthlySavings,
    });
  } catch (err) {
    req.log.error({ err }, "Error fetching outcomes summary");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
