import test from 'node:test';
import assert from 'node:assert/strict';
import { db, connectorSyncStatusTable, driftEventsTable, m365UsersTable, outcomeLedgerTable, recommendationsTable } from '@workspace/db';
import { and, eq } from 'drizzle-orm';
import { generateM365Recommendations } from '../lib/connectors/m365/m365-recommendation-generator';
import { runM365BetaDriftCheck } from '../lib/monitoring/m365-beta-drift';
import { assertLiveM365MutationAllowed } from '../domain/m365/mutationGuard';

const tenantId = 'fixture-m365-beta-tenant';
const syncTime = '2026-05-26T00:00:00.000Z';
const oldActivityAt = '2025-01-01T00:00:00.000Z';
const recentActivityAt = '2026-05-01T00:00:00.000Z';

async function clearTenant() {
  await db.delete(driftEventsTable).where(eq(driftEventsTable.tenantId, tenantId));
  await db.delete(outcomeLedgerTable).where(eq(outcomeLedgerTable.tenantId, tenantId));
  await db.delete(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId));
  await db.delete(m365UsersTable).where(eq(m365UsersTable.tenantId, tenantId));
  await db.delete(connectorSyncStatusTable).where(eq(connectorSyncStatusTable.tenantId, tenantId));
}

async function persistRecommendations(recs: ReturnType<typeof generateM365Recommendations>['recommendations']) {
  for (const rec of recs) {
    const stableKey = `${tenantId}:${rec.affectedUser.userPrincipalName}:${rec.recommendationType}:${[...rec.affectedLicenses].sort().join(',')}`;
    const [existing] = await db.select().from(recommendationsTable).where(and(eq(recommendationsTable.tenantId, tenantId), eq(recommendationsTable.correlationId, stableKey))).limit(1);
    const patch = { tenantId, userEmail: rec.affectedUser.userPrincipalName, displayName: rec.affectedUser.displayName, licenceSku: rec.affectedLicenses.join(','), monthlyCost: rec.projectedMonthlySavings, annualisedCost: rec.projectedAnnualSavings, trustScore: rec.trustLevel === 'HIGH' ? 90 : rec.trustLevel === 'MEDIUM' ? 70 : 50, executionStatus: rec.approvalRequirement === 'REQUIRED' ? 'APPROVAL_REQUIRED' : 'DRY_RUN_READY', status: 'pending', playbook: rec.recommendationType, playbookId: rec.playbookId, playbookName: rec.playbookId, playbookEvidence: { proofReferences: rec.proofReferences }, connector: 'm365', connectorHealth: rec.evidenceFreshness === 'FRESH' ? 'HEALTHY' : 'DEGRADED', freshnessBand: rec.evidenceFreshness, actionType: 'REMOVE_LICENSE', targetEntityId: rec.affectedUser.userId, expectedMonthlySaving: rec.projectedMonthlySavings, expectedAnnualSaving: rec.projectedAnnualSavings, recommendationRiskClass: rec.blastRadiusClass, recommendationExecutionMode: rec.approvalRequirement === 'REQUIRED' ? 'APPROVAL_REQUIRED' : 'DRY_RUN_ONLY', recommendationStatus: 'CANDIDATE', correlationId: stableKey } as const;
    let recommendationId = 0;
    if (existing) {
      const [saved] = await db.update(recommendationsTable).set({ ...patch, updatedAt: new Date() }).where(eq(recommendationsTable.id, existing.id)).returning({ id: recommendationsTable.id });
      recommendationId = saved.id;
    } else {
      const [saved] = await db.insert(recommendationsTable).values(patch as any).returning({ id: recommendationsTable.id });
      recommendationId = saved.id;
    }
    await db.insert(outcomeLedgerTable).values({ tenantId, recommendationId, userEmail: rec.affectedUser.userPrincipalName, displayName: rec.affectedUser.displayName, action: 'PROJECTED_ONLY', licenceSku: rec.affectedLicenses.join(','), monthlySaving: rec.projectedMonthlySavings, annualisedSaving: rec.projectedAnnualSavings, approved: false, executed: false, executionMode: 'DRY_RUN_ONLY', savingConfidence: 'ESTIMATED', evidence: { verifiedMonthlySavings: 0, verifiedAnnualSavings: 0 }, executionStatus: 'PROJECTED' });
  }
}

test('m365 beta e2e fixture loop is deterministic and non-mutating', async (t) => {
  if (process.env.RUN_M365_FIXTURE_DB_TEST !== 'true') { t.skip('Set RUN_M365_FIXTURE_DB_TEST=true to run DB-backed fixture verification'); return; }
  await clearTenant();
  await db.insert(connectorSyncStatusTable).values({ tenantId, connector: 'M365', lastSyncTime: new Date(syncTime), connectorHealth: 'HEALTHY', dataFreshnessScore: 1, freshnessBand: '0_7', partialData: 'false', requestId: 'fixture-sync' });
  const users = [
    { upn: 'disabled.user@example.com', name: 'Disabled User', enabled: 'false', skus: ['sku-e3'], last: oldActivityAt },
    { upn: 'inactive.user@example.com', name: 'Inactive User', enabled: 'true', skus: ['sku-e3'], last: oldActivityAt },
    { upn: 'active.user@example.com', name: 'Active User', enabled: 'true', skus: ['sku-e3'], last: recentActivityAt },
    { upn: 'missing.activity@example.com', name: 'Missing Activity User', enabled: 'true', skus: ['sku-e3'], last: null },
    { upn: 'svc-admin@example.com', name: 'Service Admin', enabled: 'false', skus: ['sku-e5'], last: oldActivityAt },
    { upn: 'e5.underuse@example.com', name: 'E5 Underuse', enabled: 'true', skus: ['sku-e5'], last: oldActivityAt },
  ];
  for (const u of users) await db.insert(m365UsersTable).values({ tenantId, sourceObjectId: u.upn, userPrincipalName: u.upn, displayName: u.name, accountEnabled: u.enabled, assignedLicenses: u.skus, lastLoginDaysAgo: u.last ? 180 : null, sourceTimestamp: new Date(syncTime), ingestionRunId: 'fixture-run', connectorHealth: 'HEALTHY', dataFreshnessScore: 1, freshnessBand: '0_7', partialData: 'false' });

  const normalizedEvidence = users.map((u, i) => ({ tenantId, userId: `u-${i}`, userPrincipalName: u.upn, displayName: u.name, accountEnabled: u.enabled === 'true', assignedSkuIds: u.skus, assignedSkuNames: u.skus.map((s) => s === 'sku-e3' ? 'ENTERPRISEPACK' : 'ENTERPRISEPREMIUM'), assignedLicenseCount: u.skus.length, lastSignInDateTime: u.last, lastNonInteractiveSignInDateTime: u.last, inactivityDays: u.last ? (u.last === oldActivityAt ? 180 : 25) : null, evidenceFreshness: u.last ? 'FRESH' : 'PARTIAL', evidenceFreshnessReason: 'FIXTURE', evidenceConfidence: u.last ? 0.95 : 0.5, isDisabledLicensedUser: u.enabled === 'false' && u.skus.length > 0, isInactiveLicensedUser: u.enabled === 'true' && u.last === oldActivityAt, isAdminProtected: u.upn.includes('admin'), isServiceAccountCandidate: u.upn.includes('svc-'), exclusionReasons: (u.upn.includes('admin') || u.upn.includes('svc-')) ? ['ADMIN_PROTECTED'] : [], sourceEvidenceIds: [`user:${u.upn}`], normalizedAt: syncTime }));

  const generated1 = generateM365Recommendations({ tenantId, normalizedEvidence: normalizedEvidence as any, skuPricingCatalog: [{ skuId: 'sku-e5', monthlyPrice: 57 }, { skuId: 'sku-e3', monthlyPrice: 36 }, { skuId: 'sku-copilot', monthlyPrice: 30 }], generationOptions: { inactivityDaysThreshold: 90 } });
  assert.ok(generated1.summary.recommendationsGenerated > 0);
  await persistRecommendations(generated1.recommendations);
  const recs1 = await db.select().from(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId));
  assert.ok(recs1.some((r) => r.userEmail === 'disabled.user@example.com'));
  assert.ok(recs1.some((r) => r.userEmail === 'inactive.user@example.com'));
  assert.equal(recs1.some((r) => r.userEmail === 'active.user@example.com' && String(r.playbook).includes('RECLAIM')), false);
  assert.equal(recs1.some((r) => r.userEmail === 'missing.activity@example.com' && String(r.playbook).includes('RECLAIM')), false);
  assert.equal(recs1.some((r) => r.userEmail === 'svc-admin@example.com'), false);

  const firstCount = recs1.length;
  const generated2 = generateM365Recommendations({ tenantId, normalizedEvidence: normalizedEvidence as any, skuPricingCatalog: [{ skuId: 'sku-e5', monthlyPrice: 57 }, { skuId: 'sku-e3', monthlyPrice: 36 }, { skuId: 'sku-copilot', monthlyPrice: 30 }], generationOptions: { inactivityDaysThreshold: 90 } });
  await persistRecommendations(generated2.recommendations);
  const recs2 = await db.select().from(recommendationsTable).where(eq(recommendationsTable.tenantId, tenantId));
  assert.equal(recs2.length, firstCount);

  const outcomes = await db.select().from(outcomeLedgerTable).where(eq(outcomeLedgerTable.tenantId, tenantId));
  assert.ok(outcomes.length >= recs2.length);
  assert.ok(outcomes.every((o) => Number((o.evidence as any).verifiedMonthlySavings ?? 0) === 0));

  const [targetRec] = recs2.filter((r) => r.userEmail === 'disabled.user@example.com');
  const [dryRun] = await db.insert(outcomeLedgerTable).values({ tenantId, recommendationId: targetRec.id, userEmail: targetRec.userEmail, displayName: targetRec.displayName, action: 'DRY_RUN_ONLY', licenceSku: targetRec.licenceSku, beforeCost: targetRec.monthlyCost, afterCost: targetRec.monthlyCost, monthlySaving: targetRec.monthlyCost, annualisedSaving: targetRec.annualisedCost, approved: false, executed: false, executionMode: 'DRY_RUN_ONLY', evidence: { summary: 'Dry-run completed. No Microsoft 365 changes were made.', verifiedMonthlySavings: 0, verifiedAnnualSavings: 0 }, executionStatus: 'DRY_RUN_COMPLETED' }).returning();
  assert.equal((dryRun.evidence as any).summary.includes('No Microsoft 365 changes were made.'), true);

  const drift1 = await runM365BetaDriftCheck(tenantId);
  const drift2 = await runM365BetaDriftCheck(tenantId);
  assert.ok(drift1.summary.activeDriftEvents >= 1);
  assert.equal(drift2.summary.activeDriftEvents, drift1.summary.activeDriftEvents);

  delete process.env.ENABLE_LIVE_M365_EXECUTION;
  assert.throws(() => assertLiveM365MutationAllowed({ runtimeEnvironment: 'LIVE', approvalState: 'APPROVED', connectorCapability: 'GOVERNED_EXECUTION', trustScore: 99, riskClass: 'LOW', idempotencyKey: 'x' }));

  await clearTenant();
});
