import type { PlatformReadinessReport, ReadinessCategoryScore } from './platform-audit-types';
import { connectorRealityAudit } from './connector-reality-audit';
import { pillarStoryReadinessAudit, allCriteriaMet } from './pillar-story-readiness-audit';
import { authorityMaturityAudit } from './authority-maturity-audit';
import { decisionLineageAudit } from './decision-lineage-audit';
import { silentFallbackRisks } from './demo-reality-audit';
import { debtBySeverity } from './technical-debt-registry';

/**
 * Sprint 8, Workstream 8: derives a single platform readiness score from
 * the other workstream registries. This is a read-only roll-up -- it does
 * not change any underlying classification, only summarises it.
 */
const maturityWeight: Record<string, number> = { READY: 100, PARTIAL: 60, FOUNDATIONAL: 30 };
const realityWeight: Record<string, number> = { LIVE: 100, PARTIAL: 60, MOCK: 30, STUB: 10, NOT_SUPPORTED: 100 };

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

function controlEngineScore(): ReadinessCategoryScore {
  const scores = connectorRealityAudit.map((c) => realityWeight[c.execution]);
  const mockConnectors = connectorRealityAudit.filter((c) => c.execution === 'MOCK').map((c) => c.connector);
  return {
    category: 'CONTROL_ENGINE',
    score: average(scores),
    rationale: 'Average execution-reality score across all connectors; M365 is fully live, cloud connectors (AWS/Azure/Snowflake/Databricks) are simulated execution.',
    blockers: mockConnectors.length ? [`Simulated (non-live) execution: ${mockConnectors.join(', ')}`] : [],
  };
}

function canonicalModelScore(): ReadinessCategoryScore {
  const scores = decisionLineageAudit.flatMap((entry) => [
    entry.investmentToAsset, entry.assetToDecision, entry.decisionToOutcome, entry.outcomeToProtectedValue,
  ].map((status) => (status === 'COMPLETE' ? 100 : status === 'INFERRED' ? 60 : status === 'BROKEN' ? 20 : 0)));
  const brokenOrMissing = decisionLineageAudit.filter((entry) =>
    [entry.investmentToAsset, entry.assetToDecision, entry.decisionToOutcome, entry.outcomeToProtectedValue].some(
      (s) => s === 'MISSING' || s === 'BROKEN',
    ),
  );
  return {
    category: 'CANONICAL_MODEL',
    score: average(scores),
    rationale: 'Average lineage-link completeness across audited sources (M365, Flexera) for Investment->Asset->Decision->Outcome->Protected Value.',
    blockers: brokenOrMissing.map((entry) => `${entry.source}: missing/broken lineage link`),
  };
}

function userExperienceScore(): ReadinessCategoryScore {
  const risks = silentFallbackRisks();
  return {
    category: 'USER_EXPERIENCE',
    score: risks.length === 0 ? 95 : Math.max(50, 95 - risks.length * 15),
    rationale: 'No customer-facing page silently falls back to demo data on the happy path; deduction for hooks with silent live-fetch-failure-to-demo-data fallback.',
    blockers: risks.map((r) => `${r.surface}: ${r.notes}`),
  };
}

function proofAndAuditabilityScore(): ReadinessCategoryScore {
  const scores = authorityMaturityAudit.map((a) => maturityWeight[a.productionReadiness]);
  const weak = authorityMaturityAudit.filter((a) => a.productionReadiness !== 'READY');
  return {
    category: 'PROOF_AND_AUDITABILITY',
    score: average(scores),
    rationale: 'Average production-readiness across the five canonical authorities (Principal, Evidence Registry, Asset Registry, Decision, Value Realisation).',
    blockers: weak.map((a) => `${a.authority}: ${a.productionReadiness}`),
  };
}

function connectorRealityScore(): ReadinessCategoryScore {
  const scores = connectorRealityAudit.flatMap((c) => [c.discovery, c.execution, c.verification, c.protection].map((r) => realityWeight[r]));
  return {
    category: 'CONNECTOR_REALITY',
    score: average(scores),
    rationale: 'Average reality score across Discovery/Execution/Verification/Protection for all classified connectors.',
    blockers: [],
  };
}

function executiveStoryScore(): ReadinessCategoryScore {
  const unmet = pillarStoryReadinessAudit.filter((entry) => !allCriteriaMet(entry));
  return {
    category: 'EXECUTIVE_STORY',
    score: average(pillarStoryReadinessAudit.map((entry) => (allCriteriaMet(entry) ? 100 : 60))),
    rationale: 'All three pillar narratives have evidence, proof, and UI; Value Realisation lacks full data lineage for Flexera.',
    blockers: unmet.map((entry) => `${entry.pillar}: incomplete (${entry.notes})`),
  };
}

export function buildPlatformReadinessReport(): PlatformReadinessReport {
  const categories = [
    controlEngineScore(),
    canonicalModelScore(),
    userExperienceScore(),
    proofAndAuditabilityScore(),
    connectorRealityScore(),
    executiveStoryScore(),
  ];
  const overallScore = average(categories.map((c) => c.score));
  const blockers = categories.flatMap((c) => c.blockers);
  const mustFix = debtBySeverity('MUST_FIX').map((d) => `${d.area}: ${d.recommendation}`);
  return {
    overallScore,
    categories,
    blockers,
    nextActions: [
      ...mustFix,
      'Wire real provider API calls behind controlled-execution scaffolding for AWS/Azure/Snowflake/Databricks, or label them as simulation-only.',
      'Add FK-backed lineage for Flexera decisions/outcomes.',
    ],
  };
}
