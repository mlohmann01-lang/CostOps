import {
  connectorSyncStatusTable,
  connectorTrustSnapshotsTable,
  db,
  evidenceReconciliationFindingsTable,
  recommendationDecisionTracesTable,
  recommendationOutcomesTable,
  recommendationRationalesTable,
  recommendationsTable,
  suppressedRecommendationsTable,
} from "../lib/db/src/index.ts";

const tenantId = process.env.GOLDEN_DEMO_TENANT_ID ?? "tenant-contoso-retail-group";
const tenantName = "Contoso Retail Group";
const seededAt = new Date("2026-04-30T09:00:00.000Z");
const connectorId = "m365-contoso-au-nz";

const recommendationsFixture = [
  { key: "SCENARIO_A", email: "ava.nguyen@contoso-retail.demo", trust: "HIGH", status: "READY_FOR_ORCHESTRATION", outcome: "REALIZED", projectedMonthly: 840, realizedMonthly: 840 },
  { key: "SCENARIO_B", email: "liam.carter@contoso-retail.demo", trust: "LOW", status: "NEEDS_TRUST_REVIEW", outcome: "PENDING", projectedMonthly: 560, realizedMonthly: 0 },
  { key: "SCENARIO_D", email: "sophia.wright@contoso-retail.demo", trust: "HIGH", status: "READY_FOR_ORCHESTRATION", outcome: "DRIFTED", projectedMonthly: 420, realizedMonthly: 0 },
  { key: "SCENARIO_E", email: "ethan.brooks@contoso-retail.demo", trust: "HIGH", status: "READY_FOR_ORCHESTRATION", outcome: "REVERSED", projectedMonthly: 490, realizedMonthly: 0 },
];

export async function resetGoldenDemo() {
  if (!tenantId.includes("demo") && !tenantId.includes("contoso")) throw new Error("Refusing to reset non-demo tenant");
  await db.delete(recommendationDecisionTracesTable);
  await db.delete(recommendationOutcomesTable);
  await db.delete(recommendationRationalesTable);
  await db.delete(suppressedRecommendationsTable);
  await db.delete(recommendationsTable);
  await db.delete(evidenceReconciliationFindingsTable);
  await db.delete(connectorTrustSnapshotsTable);
  await db.delete(connectorSyncStatusTable);
}

export async function seedGoldenDemo() {
  await resetGoldenDemo();

  await db.insert(connectorSyncStatusTable).values({ tenantId, connector: "M365", status: "SYNCED", connectorHealth: "HEALTHY", summary: { region: ["AU", "NZ"], licenses: 5800 }, lastSyncAt: seededAt });

  const [trustSnapshot] = await db.insert(connectorTrustSnapshotsTable).values({
    tenantId,
    connectorType: "M365",
    connectorId,
    sourceSystem: "Microsoft Graph",
    syncRunId: "golden-demo-sync-2026-04-30",
    trustScore: "78.00",
    trustBand: "MEDIUM",
    freshnessScore: "91.00",
    completenessScore: "84.00",
    consistencyScore: "72.00",
    identityMatchScore: "81.00",
    sourceReliabilityScore: "88.00",
    criticalFindings: ["LICENCE_ASSIGNMENT_CONFLICT"],
    warningFindings: ["STALE_EVIDENCE"],
    createdAt: seededAt,
  }).returning();

  await db.insert(evidenceReconciliationFindingsTable).values([
    { tenantId, connectorType: "M365", sourceSystem: "Microsoft Graph", entityType: "USER", entityId: "user-liam-carter", findingType: "STALE_EVIDENCE", severity: "WARN", status: "OPEN", description: "Last sign-in evidence older than SLA", recommendedResolution: "Re-sync user activity", evidenceSnapshot: { evidenceAgeHours: 56 } },
    { tenantId, connectorType: "M365", sourceSystem: "Microsoft Graph", entityType: "USER", entityId: "user-quarantined", findingType: "LICENCE_ASSIGNMENT_CONFLICT", severity: "CRITICAL", status: "OPEN", description: "Conflicting SKU state across snapshots", recommendedResolution: "Manual license reconciliation", evidenceSnapshot: { conflict: true } },
    { tenantId, connectorType: "M365", sourceSystem: "Microsoft Graph", entityType: "USER", entityId: "user-merged", findingType: "DUPLICATE_ENTITY", severity: "WARN", status: "RESOLVED", description: "Duplicate identity resolved", recommendedResolution: "No action required", evidenceSnapshot: { duplicateResolved: true }, resolvedAt: new Date("2026-04-29T07:00:00.000Z") },
    { tenantId, connectorType: "M365", sourceSystem: "Microsoft Graph", entityType: "USER", entityId: "user-temp-suppress", findingType: "KNOWN_EXCEPTION", severity: "WARN", status: "SUPPRESSED", description: "Temporary carve-out during migration", recommendedResolution: "Review after migration freeze", evidenceSnapshot: { changeWindow: "FY26-Q2" } },
  ]);

  const inserted = await db.insert(recommendationsTable).values(recommendationsFixture.map((r, i) => ({
    tenantId,
    userEmail: r.email,
    displayName: r.email.split("@")[0],
    licenceSku: "M365_E5",
    monthlyCost: r.projectedMonthly,
    annualisedCost: r.projectedMonthly * 12,
    trustScore: r.trust === "LOW" ? 0.44 : 0.9,
    entityTrustScore: r.trust === "LOW" ? 0.42 : 0.91,
    recommendationTrustScore: r.trust === "LOW" ? 0.39 : 0.89,
    executionReadinessScore: r.status === "READY_FOR_ORCHESTRATION" ? 0.88 : 0.31,
    executionStatus: r.status,
    playbook: "m365_cost_control",
    playbookId: "m365_inactive_user_reclaim",
    playbookName: "Inactive User License Reclaim",
    connector: "M365",
    connectorHealth: "HEALTHY",
    recommendationStatus: r.status,
    actionType: "REMOVE_LICENSE",
    targetEntityId: `user-${i + 1}`,
    targetEntityType: "USER",
    expectedMonthlySaving: r.projectedMonthly,
    expectedAnnualSaving: r.projectedMonthly * 12,
    correlationId: `golden-demo:${r.key}`,
    daysSinceActivity: r.key === "SCENARIO_A" ? 143 : r.key === "SCENARIO_B" ? 61 : 95,
    evidenceSummary: { inactivityDays: r.key === "SCENARIO_A" ? 143 : 95, graphVerified: true },
  }))).returning();

  await db.insert(suppressedRecommendationsTable).values({ tenantId, playbookId: "m365_inactive_user_reclaim", targetEntityId: "user-quarantined", reasonCode: "TRUST_QUARANTINED", reasonText: "Recommendation suppressed due to critical reconciliation blocker", evidenceSnapshot: { trustBand: "QUARANTINED", blocker: "LICENCE_ASSIGNMENT_CONFLICT" }, correlationId: "golden-demo:SCENARIO_C" });

  for (const [idx, rec] of inserted.entries()) {
    const fixture = recommendationsFixture[idx]!;
    const [rationale] = await db.insert(recommendationRationalesTable).values({
      tenantId,
      recommendationId: String(rec.id),
      connectorType: "M365",
      playbookId: "m365_inactive_user_reclaim",
      playbookName: "Inactive User License Reclaim",
      recommendationStatus: fixture.status,
      trustBand: fixture.trust,
      overallTrustScore: fixture.trust === "LOW" ? 44 : 90,
      projectedSavingsMonthly: fixture.projectedMonthly,
      projectedSavingsAnnualized: fixture.projectedMonthly * 12,
      projectedSavingsConfidence: fixture.trust === "LOW" ? "LOW" : "HIGH",
      whyGenerated: { snapshot: "User inactive for 143 days", matchedPlaybook: true },
      whySafe: { governance: "Read-only evidence and approval-required execution mode" },
      whyBlocked: fixture.trust === "LOW" ? { reason: "Unresolved stale evidence warning" } : {},
      trustFactors: { connectorTrust: fixture.trust, score: fixture.trust === "LOW" ? 44 : 90 },
      reconciliationFactors: { openWarnings: fixture.trust === "LOW" ? 1 : 0, blockers: 0 },
      governanceFactors: { requiresApproval: true, policy: "contoso-demo-policy" },
      projectedSavingsFactors: { skuMonthlyCost: fixture.projectedMonthly, savingsConfidence: fixture.trust === "LOW" ? "LOW" : "HIGH" },
      evidenceLineage: { source: "Graph", syncRunId: "golden-demo-sync-2026-04-30" },
      evidenceRecordIds: [`graph:${fixture.key.toLowerCase()}:license`, `graph:${fixture.key.toLowerCase()}:activity`],
      connectorTrustSnapshotId: String(trustSnapshot.id),
      deterministicHash: `hash:rationale:${fixture.key}`,
      generatedAt: seededAt,
    }).returning();

    await db.insert(recommendationDecisionTracesTable).values([
      { tenantId, recommendationId: String(rec.id), recommendationRationaleId: String(rationale.id), stage: "EVIDENCE", stageOrder: "1", outcome: "PASS", reason: "License assignment verified in Graph", sourceEvidenceIds: [`graph:${fixture.key.toLowerCase()}:license`], connectorTrustSnapshotId: String(trustSnapshot.id), traceHash: `trace:${fixture.key}:1` },
      { tenantId, recommendationId: String(rec.id), recommendationRationaleId: String(rationale.id), stage: "TRUST", stageOrder: "2", outcome: fixture.trust === "LOW" ? "WARN" : "PASS", reason: fixture.trust === "LOW" ? "Connector trust LOW" : "Connector trust HIGH", traceHash: `trace:${fixture.key}:2` },
      { tenantId, recommendationId: String(rec.id), recommendationRationaleId: String(rationale.id), stage: "GOVERNANCE", stageOrder: "3", outcome: "PASS", reason: "Approval workflow required before action", traceHash: `trace:${fixture.key}:3` },
    ]);

    const history = fixture.outcome === "DRIFTED" ? ["PENDING", "REALIZED", "DRIFTED"] : fixture.outcome === "REVERSED" ? ["PENDING", "REALIZED", "REVERSED"] : ["PENDING", fixture.outcome];

    await db.insert(recommendationOutcomesTable).values({
      tenantId,
      recommendationId: String(rec.id),
      recommendationRationaleId: String(rationale.id),
      connectorType: "m365",
      playbookId: "m365_inactive_user_reclaim",
      outcomeStatus: fixture.outcome,
      projectedMonthlySavings: fixture.projectedMonthly,
      projectedAnnualizedSavings: fixture.projectedMonthly * 12,
      realizedMonthlySavings: fixture.realizedMonthly,
      realizedAnnualizedSavings: fixture.realizedMonthly * 12,
      realizationDelta: fixture.realizedMonthly - fixture.projectedMonthly,
      realizationDeltaPercent: fixture.projectedMonthly === 0 ? 0 : ((fixture.realizedMonthly - fixture.projectedMonthly) / fixture.projectedMonthly) * 100,
      resolutionConfidence: fixture.trust === "LOW" ? "LOW" : "HIGH",
      confidenceCalibration: fixture.outcome === "REALIZED" ? "CONFIDENCE_CALIBRATED" : "CONFIDENCE_DEGRADED",
      resolutionEvidence: { history, appendOnly: true },
      connectorEvidenceSnapshot: { health: "HEALTHY", trustBand: fixture.trust },
      outcomeLedgerReferences: history.map((h, i) => ({ ledgerId: `ledger:${rec.id}:${i + 1}`, status: h, at: new Date(seededAt.getTime() + i * 3600_000).toISOString() })),
      postResolutionLineage: { driftRate: "6.3%", reversalRate: "3.1%" },
      driftDetected: fixture.outcome === "DRIFTED",
      reversalDetected: fixture.outcome === "REVERSED",
      driftReason: fixture.outcome === "DRIFTED" ? "License was re-assigned after 21 days" : null,
      reversalReason: fixture.outcome === "REVERSED" ? "Business exception approved and license restored" : null,
      deterministicHash: `hash:outcome:${fixture.key}`,
      resolvedAt: seededAt,
      createdAt: seededAt,
    });
  }

  return { tenantId, tenantName, projectedMonthlySavings: 18400, realizedMonthlySavings: 15900, projectedAnnualizedSavings: 220800, realizedAnnualizedSavings: 190800, outcomes: { REALIZED: 24, PARTIALLY_REALIZED: 5, FAILED: 3, DRIFTED: 2, REVERSED: 1 } };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedGoldenDemo().then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error); process.exit(1); });
}
