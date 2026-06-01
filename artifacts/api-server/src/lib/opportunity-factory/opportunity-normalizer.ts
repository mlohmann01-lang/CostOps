import type { Opportunity, OpportunityDomain, OpportunityReadiness, OpportunitySource, OpportunityStatus, OpportunityUrgency } from "../opportunities/opportunity-types";

export type RawOpportunity = Record<string, any>;

const sourceAliases: Record<string, OpportunitySource> = {
  TRUST: "TRUST",
  VENDOR_CHANGE: "VENDOR_CHANGE",
  RENEWAL: "RENEWAL",
  BENCHMARK: "BENCHMARK",
  CONTRACT: "CONTRACT",
  UTILIZATION: "UTILIZATION",
  DRIFT: "DRIFT",
  M365_PLAYBOOK: "M365_PLAYBOOK",
};

const domainAliases: Record<string, OpportunityDomain> = {
  MICROSOFT: "M365",
  COPILOT: "M365",
  M365: "M365",
  AWS: "AWS",
  AZURE: "AZURE",
  SNOWFLAKE: "SNOWFLAKE",
  DATABRICKS: "DATABRICKS",
  SALESFORCE: "SALESFORCE",
  SERVICENOW: "SERVICENOW",
  ADOBE: "M365",
  AI_RUNTIME: "AI_RUNTIME",
};

function clampScore(value: unknown, fallback: number) {
  const score = Number(value ?? fallback);
  if (!Number.isFinite(score)) return fallback;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function money(value: unknown) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return 0;
  return Math.max(0, Math.round(amount));
}

function sourceFor(raw: RawOpportunity): OpportunitySource {
  const value = String(raw.source ?? raw.recommendationSource ?? "TRUST").toUpperCase();
  return sourceAliases[value] ?? "TRUST";
}

function domainFor(raw: RawOpportunity): OpportunityDomain {
  const value = String(raw.domain ?? raw.vendor ?? raw.platform ?? "M365").toUpperCase();
  return domainAliases[value] ?? "M365";
}

function readinessFor(raw: RawOpportunity): OpportunityReadiness {
  const value = String(raw.readiness ?? "").toUpperCase();
  if (["ELIGIBLE", "APPROVAL_REQUIRED", "BLOCKED", "MANUAL_ONLY"].includes(value)) return value as OpportunityReadiness;
  if (raw.governanceRequired === true) return "APPROVAL_REQUIRED";
  return "ELIGIBLE";
}

function statusFor(raw: RawOpportunity): OpportunityStatus {
  const value = String(raw.status ?? "DISCOVERED").toUpperCase();
  if (["DISCOVERED", "PRIORITIZED", "APPROVAL_PENDING", "APPROVED", "EXECUTING", "EXECUTED", "VERIFIED", "DRIFTED", "CLOSED"].includes(value)) return value as OpportunityStatus;
  return "DISCOVERED";
}

function urgencyFor(readiness: OpportunityReadiness, monthlySavings: number): OpportunityUrgency {
  if (readiness === "BLOCKED" && monthlySavings >= 10000) return "CRITICAL";
  if (monthlySavings >= 10000) return "HIGH";
  if (monthlySavings >= 5000) return "MEDIUM";
  return "LOW";
}

export function normalizeOpportunity(raw: RawOpportunity, tenantId: string, now = new Date().toISOString()): Opportunity {
  const source = sourceFor(raw);
  const sourceReferenceId = String(raw.sourceReferenceId ?? raw.changeId ?? raw.renewalId ?? raw.benchmarkId ?? raw.contractId ?? raw.utilizationRecordId ?? raw.driftId ?? raw.findingId ?? raw.id ?? raw.opportunityId);
  const id = String(raw.id ?? raw.opportunityId ?? `opp-${source.toLowerCase()}-${sourceReferenceId}`).replace(/[^a-zA-Z0-9:_-]/g, "-");
  const projectedMonthlySavings = money(raw.projectedMonthlySavings ?? raw.monthlySavings ?? raw.monthlyCostDelta);
  const projectedAnnualSavings = money(raw.projectedAnnualSavings ?? projectedMonthlySavings * 12);
  const readiness = readinessFor(raw);
  const confidenceScore = clampScore(raw.confidenceScore, raw.governanceRequired ? 78 : 74);
  const trustScore = clampScore(raw.trustScore, raw.governanceRequired ? 76 : 80);
  const createdAt = String(raw.createdAt ?? now);
  const updatedAt = String(raw.updatedAt ?? now);
  const urgency = String(raw.urgency ?? urgencyFor(readiness, projectedMonthlySavings)).toUpperCase() as OpportunityUrgency;
  return {
    ...raw,
    id,
    tenantId,
    source,
    sourceReferenceId,
    title: String(raw.title ?? `${source.replaceAll("_", " ")} opportunity`),
    description: String(raw.description ?? raw.title ?? `${source.replaceAll("_", " ")} opportunity discovered by the opportunity factory.`),
    domain: domainFor(raw),
    projectedMonthlySavings,
    projectedAnnualSavings,
    confidenceScore,
    trustScore,
    readiness,
    status: statusFor(raw),
    urgency: ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(urgency) ? urgency : urgencyFor(readiness, projectedMonthlySavings),
    createdAt,
    updatedAt,
    sources: Array.from(new Set([...(Array.isArray(raw.sources) ? raw.sources : []), source])),
    reasons: Array.isArray(raw.reasons) ? raw.reasons : raw.trustPrerequisites ?? [],
    evidence: Array.isArray(raw.evidence) ? raw.evidence : raw.evidence ? [raw.evidence] : [],
    entityKey: String(raw.entityKey ?? raw.changeId ?? raw.renewalId ?? raw.benchmarkId ?? raw.contractId ?? raw.utilizationRecordId ?? raw.sourceReferenceId ?? sourceReferenceId),
    recommendationKey: String(raw.recommendationKey ?? raw.actionType ?? raw.title ?? id).toLowerCase(),
    costObjectKey: String(raw.costObjectKey ?? raw.domain ?? raw.vendor ?? raw.platform ?? sourceReferenceId).toUpperCase(),
  };
}

export function normalizeOpportunities(raw: RawOpportunity[], tenantId: string, now = new Date().toISOString()) {
  return raw.map((opportunity) => normalizeOpportunity(opportunity, tenantId, now));
}
