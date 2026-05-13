import { db, driftEventsTable, outcomeVerificationsTable, pricingDriftEventsTable, type OutcomeLedger } from "@workspace/db";
import { and, desc, eq } from "drizzle-orm";

const strongPricing = new Set(["VERIFIED_CONTRACT", "VERIFIED_INVOICE", "VERIFIED_CSP"]);

export async function verifyOutcome(outcomeLedgerRow: OutcomeLedger) {
  const tenantId = outcomeLedgerRow.tenantId;
  const [openDrift] = await db.select().from(driftEventsTable).where(and(eq(driftEventsTable.tenantId, tenantId), eq(driftEventsTable.outcomeLedgerId, outcomeLedgerRow.id), eq(driftEventsTable.driftStatus, "OPEN"))).orderBy(desc(driftEventsTable.detectedAt)).limit(1);
  const [pricingConflict] = await db.select().from(pricingDriftEventsTable).where(and(eq(pricingDriftEventsTable.tenantId, tenantId), eq(pricingDriftEventsTable.severity, "CONFLICT"))).orderBy(desc(pricingDriftEventsTable.detectedAt)).limit(1);

  let verificationStatus = "PROJECTED";
  let verificationConfidence = "LOW";
  let verificationSource = "LEDGER_ONLY";
  let verifiedMonthlySaving: number | null = null;

  if (pricingConflict) {
    verificationStatus = "DISPUTED";
    verificationConfidence = "MEDIUM";
  } else if (openDrift && ["LICENCE_REASSIGNED", "USER_REACTIVATED"].includes(openDrift.driftType)) {
    verificationStatus = "REVERSED";
    verificationConfidence = "HIGH";
  } else if (strongPricing.has(outcomeLedgerRow.pricingConfidence)) {
    verificationStatus = "PARTIALLY_VERIFIED";
    verificationConfidence = "MEDIUM";
    verificationSource = "PRICING_EVIDENCE";
    verifiedMonthlySaving = outcomeLedgerRow.monthlySaving;
  }

  const projectedMonthlySaving = outcomeLedgerRow.monthlySaving;
  const varianceAmount = verifiedMonthlySaving === null ? null : verifiedMonthlySaving - projectedMonthlySaving;
  const variancePct = verifiedMonthlySaving === null || projectedMonthlySaving === 0 ? null : (varianceAmount! / projectedMonthlySaving) * 100;

  const [record] = await db.insert(outcomeVerificationsTable).values({ tenantId, outcomeLedgerId: outcomeLedgerRow.id, recommendationId: outcomeLedgerRow.recommendationId, verificationStatus, verificationConfidence, verificationSource, projectedMonthlySaving, verifiedMonthlySaving, varianceAmount, variancePct, evidence: { pricingConfidence: outcomeLedgerRow.pricingConfidence, pricingSource: outcomeLedgerRow.pricingSource, driftEvent: openDrift ?? null, pricingConflict: pricingConflict ?? null, ledgerCreatedAt: outcomeLedgerRow.createdAt } }).returning();

  return record;
}
