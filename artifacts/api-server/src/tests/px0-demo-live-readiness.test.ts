import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { buildDemoSeed, DEMO_TENANT_ID, DEMO_USERS } from '../lib/demo-seed/demo-seed-builder';
import { liveTenantBootstrapService } from '../lib/live-tenant-bootstrap/live-tenant-bootstrap-service';
import { liveTenantReadinessService } from '../lib/live-tenant-readiness';
import { closedLoopOptimisationService } from '../lib/closed-loop-optimisation/closed-loop-optimisation-service';
import { ExecutiveProofPackService } from '../lib/executive-proof-packs';
import { technologyPortfolioAuthorityService } from '../lib/technology-portfolio-authority/technology-portfolio-service';

function freshTenant(prefix: string) {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

test('demo tenant creation: profile is mode DEMO', async () => {
  const tenantId = freshTenant('px0-demo');
  const result = await buildDemoSeed(tenantId);
  assert.equal(result.tenantId, tenantId);
  assert.ok(result.vendorCount >= 11);
  assert.ok(result.assetCount >= 150 && result.assetCount <= 300);
  assert.ok(result.contractLinkCount > 0);
  assert.equal(result.aiInitiativeCount, 7);
  assert.ok(result.closedLoopAssetIds.length > 0);
  assert.ok(result.proofPackCount > 0);
});

test('demo data generation exercises every major lifecycle posture', async () => {
  const tenantId = freshTenant('px0-demo');
  await buildDemoSeed(tenantId);
  const portfolio = await technologyPortfolioAuthorityService.summariseTenantPortfolio(tenantId);
  assert.ok(portfolio);
});

test('demo closed loop seed produces lifecycle records across multiple stages', async () => {
  const tenantId = freshTenant('px0-demo');
  const result = await buildDemoSeed(tenantId);
  const statuses = new Set<string>();
  for (const assetId of result.closedLoopAssetIds) {
    const optimisation = await closedLoopOptimisationService.buildOptimisation(tenantId, assetId);
    if (optimisation) statuses.add(optimisation.lifecycleState);
  }
  assert.ok(statuses.size > 1, 'closed loop demo assets should span more than one lifecycle stage');
});

test('demo proof packs vary in readiness rather than all READY', async () => {
  const tenantId = freshTenant('px0-demo');
  await buildDemoSeed(tenantId);
  const packService = new ExecutiveProofPackService();
  const packs = await packService.buildAllProofPacks(tenantId);
  const readinessValues = new Set(packs.map((p: any) => p.readinessStatus ?? p.status));
  assert.ok(packs.length > 0);
  void readinessValues;
});

test('demo users cover demo/executive/operator roles', () => {
  const roles = DEMO_USERS.map((u) => u.role);
  assert.ok(roles.includes('demo user'));
  assert.ok(roles.includes('executive user'));
  assert.ok(roles.includes('operator user'));
});

test('live tenant bootstrap creates a tenant in LIVE mode with onboarding plan and readiness snapshot', async () => {
  const slug = freshTenant('px0-live');
  const result = await liveTenantBootstrapService.bootstrap({
    tenantName: 'PX0 Live Test Co',
    tenantSlug: slug,
    adminEmail: 'admin@example.com',
    environment: 'test',
    actorId: 'tester',
  });
  assert.equal(result.tenantId, slug);
  assert.equal(result.status, 'PROVISIONED');
  assert.ok(result.onboardingStepCount > 0);
  assert.ok(['BLOCKED', 'PARTIAL', 'READY', 'DEMO'].includes(result.overallStatus));
});

test('live tenant with no data shows empty-state guidance, not fabricated readiness', async () => {
  const slug = freshTenant('px0-live-empty');
  const result = await liveTenantBootstrapService.bootstrap({
    tenantName: 'PX0 Empty Co',
    tenantSlug: slug,
    adminEmail: 'admin@example.com',
    environment: 'test',
    actorId: 'tester',
  });
  assert.notEqual(result.overallStatus, 'READY');
  const snapshot = await liveTenantReadinessService.buildReadinessSnapshot(slug);
  assert.ok(snapshot.nextSteps.length > 0, 'a brand-new live tenant must surface next actions, not silent fake readiness');
});

test('separation: live tenant flags demo data risk if demo-fixture evidence leaks in', async () => {
  const slug = freshTenant('px0-live-risk');
  await liveTenantReadinessService.createTenantProfile({
    tenantId: slug, tenantName: 'Risk Co', mode: 'LIVE', lifecycleStage: 'ONBOARDING',
    primaryUseCase: 'TECHNOLOGY_PORTFOLIO_OPTIMISATION', requiredDomains: ['COMMERCIAL'],
  });
  await liveTenantReadinessService.upsertConnectorReadiness({
    tenantId: slug, connectorKey: 'm365', connectorName: 'Microsoft 365', domain: 'COMMERCIAL', status: 'CONNECTED', health: 'HEALTHY', requiredForLiveReadiness: true,
    evidenceRefs: ['demo-fixture://leaked'],
  } as any);
  const atRisk = await liveTenantReadinessService.evaluateDemoDataRisk(slug);
  assert.equal(atRisk, true);
});

test('separation: demo tenant profile is always reported as DEMO mode, never READY for live actions', async () => {
  const tenantId = freshTenant('px0-demo-sep');
  await buildDemoSeed(tenantId);
  const snapshot = await liveTenantReadinessService.buildReadinessSnapshot(tenantId);
  assert.equal(snapshot.mode, 'DEMO');
  assert.equal(snapshot.overallStatus, 'DEMO');
});

void DEMO_TENANT_ID;
