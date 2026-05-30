import type { OutcomeLedger } from "@workspace/db";

export type VerificationStatus = "PENDING" | "IN_PROGRESS" | "VERIFIED" | "FAILED" | "DISPUTED";
export type VerificationConfidence = "HIGH" | "MEDIUM" | "LOW";

export type EvidenceTimelineEvent = {
  stage: "Discovery" | "Recommendation" | "Approval" | "Execution" | "Verification" | "Outcome";
  timestamp: string | null;
  description: string;
  evidenceRef?: string;
};

export type OutcomeEvidencePack = {
  outcomeId: string;
  tenantId: string;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  verificationMethod: string;
  evidenceSources: string[];
  verificationConfidence: VerificationConfidence;
  verificationStatus: VerificationStatus;
  verificationTimestamp: string;
  verifiedMonthlySaving: number | null;
  projectedMonthlySaving: number;
  varianceAmount: number | null;
  variancePct: number | null;
  executionTimeline: EvidenceTimelineEvent[];
  supportingEvidence: Record<string, unknown>;
  failureReason?: string;
};

export type OutcomeVerificationResult = {
  outcomeId: string;
  tenantId: string;
  verificationStatus: VerificationStatus;
  verificationConfidence: VerificationConfidence;
  verificationMethod: string;
  projectedMonthlySaving: number;
  verifiedMonthlySaving: number | null;
  varianceAmount: number | null;
  variancePct: number | null;
  evidencePack: OutcomeEvidencePack;
  generatedAt: string;
  failureReason?: string;
};

const strongPricing = new Set(["VERIFIED_CONTRACT", "VERIFIED_INVOICE", "VERIFIED_CSP"]);

function number(value: unknown) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export function calculateVariance(projectedMonthlySaving: number, verifiedMonthlySaving: number | null) {
  if (verifiedMonthlySaving === null) return { varianceAmount: null, variancePct: null };
  const varianceAmount = verifiedMonthlySaving - projectedMonthlySaving;
  const variancePct = projectedMonthlySaving === 0 ? null : (varianceAmount / projectedMonthlySaving) * 100;
  return { varianceAmount, variancePct };
}

export function detectVerificationFailure(outcome: Pick<OutcomeLedger, "executed" | "executionStatus" | "beforeCost" | "afterCost" | "monthlySaving" | "beforeState" | "afterState" | "evidence">) {
  const evidence = object(outcome.evidence);
  if (String(evidence.verificationState ?? "").includes("DISPUT")) return "DISPUTED_BY_OPERATOR";
  if (!outcome.executed || !["EXECUTED", "VERIFIED", "COMPLETED"].includes(String(outcome.executionStatus ?? "EXECUTED"))) return "OUTCOME_NOT_EXECUTED";
  if (number(outcome.beforeCost) > 0 && number(outcome.afterCost) > number(outcome.beforeCost)) return "AFTER_COST_EXCEEDS_BEFORE_COST";
  if (number(outcome.monthlySaving) < 0) return "NEGATIVE_SAVING";
  const before = object(outcome.beforeState);
  const after = object(outcome.afterState);
  if (Object.keys(before).length > 0 && Object.keys(after).length === 0) return "MISSING_AFTER_STATE";
  return null;
}

export function calculateVerificationConfidence(input: { status: VerificationStatus; evidenceSources: string[]; pricingConfidence?: string; beforeState?: Record<string, unknown>; afterState?: Record<string, unknown>; verifiedMonthlySaving?: number | null }): VerificationConfidence {
  if (input.status === "FAILED" || input.status === "DISPUTED") return input.evidenceSources.length >= 2 ? "MEDIUM" : "LOW";
  const hasBeforeAfter = Object.keys(input.beforeState ?? {}).length > 0 && Object.keys(input.afterState ?? {}).length > 0;
  const hasGraph = input.evidenceSources.some((source) => /graph|post-execution|assignment/i.test(source));
  if (input.status === "VERIFIED" && hasBeforeAfter && hasGraph && strongPricing.has(String(input.pricingConfidence))) return "HIGH";
  if ((input.status === "VERIFIED" || input.status === "IN_PROGRESS") && (hasBeforeAfter || input.verifiedMonthlySaving !== null)) return "MEDIUM";
  return "LOW";
}

function evidenceSourcesFor(outcome: OutcomeLedger) {
  const sources = new Set<string>();
  const before = object(outcome.beforeState);
  const after = object(outcome.afterState);
  const executionEvidence = object(outcome.executionEvidence);
  if (Object.keys(before).length) sources.add("Before state snapshot");
  if (Object.keys(after).length) sources.add("After state snapshot");
  if (Object.keys(executionEvidence).length) sources.add("Execution evidence");
  if (String(outcome.action).toUpperCase().includes("LICENSE") || String(outcome.action).toUpperCase().includes("LICENCE")) {
    sources.add("Graph assignment snapshot");
    sources.add("Graph post-execution snapshot");
  }
  if (outcome.pricingSource || outcome.pricingConfidence !== "UNKNOWN") sources.add("SKU pricing reference");
  if (Object.keys(object(outcome.evidence)).length) sources.add("Outcome ledger evidence");
  return Array.from(sources);
}

export function buildEvidencePack(outcome: OutcomeLedger, result?: Partial<OutcomeVerificationResult>): OutcomeEvidencePack {
  const generatedAt = result?.generatedAt ?? new Date().toISOString();
  const projectedMonthlySaving = number(outcome.monthlySaving);
  const verifiedMonthlySaving = result?.verifiedMonthlySaving ?? verifiedSavingFor(outcome);
  const variance = calculateVariance(projectedMonthlySaving, verifiedMonthlySaving);
  const beforeState = object(outcome.beforeState);
  const afterState = object(outcome.afterState);
  const sources = evidenceSourcesFor(outcome);
  const status = result?.verificationStatus ?? statusFor(outcome);
  const confidence = result?.verificationConfidence ?? calculateVerificationConfidence({ status, evidenceSources: sources, pricingConfidence: outcome.pricingConfidence, beforeState, afterState, verifiedMonthlySaving });
  return {
    outcomeId: String(outcome.id),
    tenantId: outcome.tenantId,
    beforeState,
    afterState,
    verificationMethod: result?.verificationMethod ?? methodFor(outcome),
    evidenceSources: sources,
    verificationConfidence: confidence,
    verificationStatus: status,
    verificationTimestamp: generatedAt,
    verifiedMonthlySaving,
    projectedMonthlySaving,
    ...variance,
    executionTimeline: [
      { stage: "Discovery", timestamp: outcome.createdAt?.toISOString?.() ?? null, description: "Discovery evidence captured before recommendation." },
      { stage: "Recommendation", timestamp: outcome.createdAt?.toISOString?.() ?? null, description: `Recommendation ${outcome.recommendationId} produced ${outcome.action}.` },
      { stage: "Approval", timestamp: outcome.approvedAt?.toISOString?.() ?? null, description: outcome.approved ? "Governance approval recorded." : "Approval not recorded on ledger row." },
      { stage: "Execution", timestamp: outcome.executedAt?.toISOString?.() ?? null, description: outcome.executed ? "Execution evidence captured." : "Execution not confirmed." },
      { stage: "Verification", timestamp: generatedAt, description: `${status} with ${confidence} confidence.` },
      { stage: "Outcome", timestamp: generatedAt, description: verifiedMonthlySaving === null ? "Verified saving not yet available." : `Verified ${verifiedMonthlySaving}/month saving.` },
    ],
    supportingEvidence: {
      pricingSnapshot: object(outcome.pricingSnapshot),
      pricingConfidence: outcome.pricingConfidence,
      pricingSource: outcome.pricingSource,
      executionEvidence: object(outcome.executionEvidence),
      dryRunResult: object(outcome.dryRunResult),
      ledgerEvidence: object(outcome.evidence),
    },
    failureReason: result?.failureReason,
  };
}

export function verifyOutcome(outcome: OutcomeLedger): OutcomeVerificationResult {
  const generatedAt = new Date().toISOString();
  const failureReason = detectVerificationFailure(outcome) ?? undefined;
  const ledgerEvidence = object(outcome.evidence);
  const projectedMonthlySaving = number(outcome.monthlySaving);
  const verifiedMonthlySaving = failureReason ? null : verifiedSavingFor(outcome);
  const verificationStatus: VerificationStatus = failureReason === "DISPUTED_BY_OPERATOR" ? "DISPUTED" : failureReason ? "FAILED" : statusFor(outcome);
  const evidenceSources = evidenceSourcesFor(outcome);
  const verificationConfidence = calculateVerificationConfidence({ status: verificationStatus, evidenceSources, pricingConfidence: outcome.pricingConfidence, beforeState: object(outcome.beforeState), afterState: object(outcome.afterState), verifiedMonthlySaving });
  const verificationMethod = methodFor(outcome);
  const variance = calculateVariance(projectedMonthlySaving, verifiedMonthlySaving);
  const partial = { outcomeId: String(outcome.id), tenantId: outcome.tenantId, verificationStatus, verificationConfidence, verificationMethod, projectedMonthlySaving, verifiedMonthlySaving, ...variance, generatedAt, failureReason };
  return { ...partial, evidencePack: buildEvidencePack(outcome, partial) };
}

function verifiedSavingFor(outcome: OutcomeLedger) {
  const ledgerEvidence = object(outcome.evidence);
  const evidenceSaving = ledgerEvidence.verifiedSaving ?? ledgerEvidence.verifiedMonthlySaving;
  if (Number.isFinite(Number(evidenceSaving))) return Number(evidenceSaving);
  if (number(outcome.beforeCost) > number(outcome.afterCost)) return number(outcome.beforeCost) - number(outcome.afterCost);
  if (String(ledgerEvidence.verificationState ?? "").toUpperCase() === "VERIFIED") return number(outcome.monthlySaving);
  return null;
}

function statusFor(outcome: OutcomeLedger): VerificationStatus {
  const evidence = object(outcome.evidence);
  const state = String(evidence.verificationState ?? outcome.executionStatus ?? "").toUpperCase();
  if (state.includes("DISPUT")) return "DISPUTED";
  if (state.includes("FAILED")) return "FAILED";
  if (state.includes("VERIFYING") || state.includes("IN_PROGRESS")) return "IN_PROGRESS";
  if (verifiedSavingFor(outcome) !== null || state === "VERIFIED") return "VERIFIED";
  return "PENDING";
}

function methodFor(outcome: OutcomeLedger) {
  const sources = evidenceSourcesFor(outcome);
  if (sources.some((source) => source.includes("Graph")) && sources.includes("SKU pricing reference")) return "GRAPH_SNAPSHOT_AND_PRICING";
  if (sources.some((source) => source.includes("Graph"))) return "GRAPH_READBACK";
  if (sources.includes("SKU pricing reference")) return "COST_INFERENCE";
  return "LEDGER_ONLY";
}
