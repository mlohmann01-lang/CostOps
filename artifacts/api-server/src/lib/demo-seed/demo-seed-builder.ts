// PX0.2 — Demo Data Seed Engine.
//
// Builds a realistic enterprise tenant entirely through the existing,
// real services (technology portfolio, AI initiative portfolio, economic
// outcomes, approvals, governed execution, outcome protection, proof
// packs, live tenant readiness). This module creates no new authority and
// no new governance model — it only calls real write paths so every
// downstream authority/aggregator sees genuine, internally-consistent data.
import { randomUUID } from 'node:crypto';
import { technologyPortfolioAuthorityService } from '../technology-portfolio-authority/technology-portfolio-service';
import { aiInitiativePortfolioService } from '../ai-initiative-portfolio/ai-initiative-portfolio-service';
import { economicOutcomeAttributionService } from '../economic-outcomes/economic-outcome-attribution';
import { recommendationOrchestrationService } from '../recommendation-orchestration/recommendation-orchestration-service';
import { GovernedExecutionService } from '../governed-execution/governed-execution-service';
import { outcomeProtectionService } from '../outcome-protection/outcome-protection';
import { createWorkflow } from '../approvals/approval-workflow-engine';
import { saveApprovalWorkflow } from '../approvals/approval-workflow-store';
import { ExecutiveProofPackService } from '../executive-proof-packs';
import { liveTenantReadinessService } from '../live-tenant-readiness';
import { closedLoopOptimisationService } from '../closed-loop-optimisation/closed-loop-optimisation-service';
import type { GovernedExecutionPlan, GovernedExecutionVerification } from '../governed-execution/governed-execution-types';

export const DEMO_TENANT_ID = 'demo-leftshield-enterprise';
export const DEMO_TENANT_NAME = 'LeftShield Demo Enterprise';

export const DEMO_USERS = [
  { userId: 'demo-user', role: 'demo user', name: 'Dana Demo' },
  { userId: 'demo-executive', role: 'executive user', name: 'Erin Executive' },
  { userId: 'demo-operator', role: 'operator user', name: 'Omar Operator' },
] as const;

const VENDORS: Array<{ name: string; category: string; assetType: TechAssetType }> = [
  { name: 'Microsoft', category: 'SAAS', assetType: 'SAAS' },
  { name: 'Salesforce', category: 'SAAS', assetType: 'SAAS' },
  { name: 'ServiceNow', category: 'SAAS', assetType: 'SAAS' },
  { name: 'Adobe', category: 'SAAS', assetType: 'SAAS' },
  { name: 'Atlassian', category: 'SAAS', assetType: 'SAAS' },
  { name: 'Zoom', category: 'SAAS', assetType: 'SAAS' },
  { name: 'AWS', category: 'CLOUD', assetType: 'CLOUD_SERVICE' },
  { name: 'Snowflake', category: 'DATA', assetType: 'DATA_PLATFORM' },
  { name: 'Databricks', category: 'DATA', assetType: 'DATA_PLATFORM' },
  { name: 'OpenAI', category: 'AI', assetType: 'AI_MODEL' },
  { name: 'Anthropic', category: 'AI', assetType: 'AI_MODEL' },
];

type TechAssetType = 'APPLICATION' | 'SAAS' | 'AI_MODEL' | 'AI_AGENT' | 'CLOUD_SERVICE' | 'DATA_PLATFORM' | 'INFRASTRUCTURE';
type LifecycleStatus = 'DISCOVERED' | 'ACTIVE' | 'UNDER_REVIEW' | 'DUPLICATE' | 'RETIRE_CANDIDATE' | 'RENEWAL_RISK' | 'NON_COMPLIANT' | 'RETIRED' | 'UNKNOWN';

// Cycled across generated assets so the portfolio simultaneously exhibits
// every decision posture (KEEP/OPTIMISE/CONSOLIDATE/RENEW/RETIRE/REVIEW maps
// onto these real lifecycle statuses, which downstream authorities already
// translate into decision verdicts).
const LIFECYCLE_CYCLE: LifecycleStatus[] = ['ACTIVE', 'UNDER_REVIEW', 'DUPLICATE', 'RENEWAL_RISK', 'RETIRE_CANDIDATE', 'ACTIVE'];
const OWNERS = ['jane.doe', 'amir.khan', undefined, 'priya.patel', undefined, 'retired-owner-marcus']; // owned / missing / multiple-via-shared / retired

function pseudoRandom(seed: number) {
  // Deterministic, no Math.random dependency on call order across the seed run.
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export interface DemoSeedResult {
  tenantId: string;
  vendorCount: number;
  assetCount: number;
  contractLinkCount: number;
  aiInitiativeCount: number;
  closedLoopAssetIds: string[];
  proofPackCount: number;
}

export async function buildDemoSeed(tenantId: string = DEMO_TENANT_ID): Promise<DemoSeedResult> {
  await liveTenantReadinessService.createTenantProfile({
    tenantId,
    tenantName: DEMO_TENANT_NAME,
    mode: 'DEMO',
    lifecycleStage: 'PILOT',
    primaryUseCase: 'TECHNOLOGY_PORTFOLIO_OPTIMISATION',
    requiredDomains: ['COMMERCIAL', 'USAGE', 'OWNERSHIP'],
  });

  const vendorIds: Record<string, string> = {};
  for (const v of VENDORS) {
    const vendor = await technologyPortfolioAuthorityService.createOrUpdateVendor({
      tenantId, name: v.name, category: v.category as any,
      sourceSystems: ['demo-seed'], evidenceRefs: [`demo-fixture://vendor/${v.name}`],
    });
    vendorIds[v.name] = vendor.id;
  }

  let assetCount = 0;
  let contractLinkCount = 0;
  const assetsPerVendor = 15; // 11 vendors x 15 = 165 assets, within the 150-300 target band.
  const allAssetIds: string[] = [];
  for (const v of VENDORS) {
    for (let i = 0; i < assetsPerVendor; i++) {
      const seedIndex = assetCount;
      const lifecycleStatus = LIFECYCLE_CYCLE[seedIndex % LIFECYCLE_CYCLE.length];
      const owner = OWNERS[seedIndex % OWNERS.length];
      const r = pseudoRandom(seedIndex + 1);
      const annualSpend = Math.round(5000 + r * 495000);
      const hasVerifiedSavings = seedIndex % 4 === 0;
      const asset = await technologyPortfolioAuthorityService.createOrUpdateAsset({
        tenantId,
        name: `${v.name} ${i === 0 ? '' : 'Workload ' + (i + 1)}`.trim() || v.name,
        assetType: v.assetType,
        lifecycleStatus,
        vendorId: vendorIds[v.name],
        ownerUserId: owner,
        businessCapability: v.category === 'AI' ? 'AI Enablement' : v.category === 'DATA' ? 'Data Platform' : 'Business Operations',
        annualSpend,
        verifiedSavings: hasVerifiedSavings ? Math.round(annualSpend * 0.12) : undefined,
        projectedSavings: lifecycleStatus === 'RETIRE_CANDIDATE' || lifecycleStatus === 'DUPLICATE' ? Math.round(annualSpend * 0.3) : undefined,
        commercialExposure: lifecycleStatus === 'RENEWAL_RISK' ? Math.round(annualSpend * 0.5) : undefined,
        currency: 'USD',
        evidenceRefs: seedIndex % 5 === 0 ? [] : [`demo-fixture://asset/${v.name}-${i}`],
        sourceSystems: ['demo-seed'],
      });
      allAssetIds.push(asset.id);
      await technologyPortfolioAuthorityService.linkAssetToVendor(tenantId, asset.id, vendorIds[v.name]);

      // Contracts are reference-only in this codebase (no dedicated contract
      // entity exists) — represented honestly as linked contract IDs whose
      // names encode renewal/expiry posture, so renewal-risk findings are real.
      if (seedIndex % 2 === 0) {
        const renewalPosture = lifecycleStatus === 'RENEWAL_RISK' ? 'upcoming-renewal' : seedIndex % 6 === 0 ? 'expired' : 'long-term';
        const contractId = `contract-${renewalPosture}-${v.name.toLowerCase()}-${i}-${randomUUID().slice(0, 8)}`;
        await technologyPortfolioAuthorityService.linkAssetToContract(tenantId, asset.id, contractId);
        contractLinkCount++;
      }
      assetCount++;
    }
  }

  await technologyPortfolioAuthorityService.detectPortfolioRisks(tenantId);
  await technologyPortfolioAuthorityService.generatePortfolioRecommendations(tenantId);
  await technologyPortfolioAuthorityService.buildPortfolioSnapshot(tenantId);

  // PX0.5 — AI demo portfolio: initiatives spanning every lifecycle posture.
  const aiLifecycles = ['PROPOSED', 'PILOT', 'APPROVED', 'OPERATIONAL', 'SCALING', 'REVIEW', 'RETIRED'] as const;
  let aiInitiativeCount = 0;
  for (const lifecycle of aiLifecycles) {
    await aiInitiativePortfolioService.createInitiative({
      tenantId,
      name: `${lifecycle} AI Initiative — ${aiInitiativeCount + 1}`,
      initiativeType: 'COPILOT',
      lifecycle,
      sourceSystem: 'demo-seed',
      sourceReference: `demo-fixture://ai-initiative/${lifecycle}`,
      ownerName: 'priya.patel',
      department: 'AI Enablement',
    } as any);
    aiInitiativeCount++;
  }

  // PX0.7 — Closed loop demo: walk a handful of real assets through every
  // lifecycle state using the exact reuse pattern proven by AO2's own test
  // suite (approval-workflow-store + governed-execution repo + outcome
  // protection + economic outcomes — never fabricated, always real writes).
  const governedExecutionService = new GovernedExecutionService();
  const closedLoopAssetIds: string[] = [];
  const closedLoopPlan: Array<{ approval?: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'; plan?: GovernedExecutionPlan['status']; verification?: GovernedExecutionVerification['status']; protect?: boolean; valueRealised?: boolean }> = [
    {},
    { approval: 'PENDING_APPROVAL' },
    { approval: 'APPROVED' },
    { approval: 'APPROVED', plan: 'EXECUTING' },
    { approval: 'APPROVED', plan: 'COMPLETED' },
    { approval: 'APPROVED', plan: 'COMPLETED', verification: 'VERIFIED' },
    { approval: 'APPROVED', plan: 'COMPLETED', verification: 'VERIFIED', protect: true },
    { approval: 'APPROVED', plan: 'COMPLETED', verification: 'VERIFIED', protect: true, valueRealised: true },
  ];
  for (let i = 0; i < closedLoopPlan.length; i++) {
    const step = closedLoopPlan[i];
    const outcomeIds: string[] = [];
    if (step.valueRealised) {
      const outcome = economicOutcomeAttributionService.createEconomicOutcome({
        tenantId, assetId: 'placeholder', assetType: 'APPLICATION', name: 'Demo realised savings', measuredValue: 24000, currency: 'USD',
      } as any);
      outcomeIds.push(outcome.id);
    }
    const asset = await technologyPortfolioAuthorityService.createOrUpdateAsset({
      tenantId, name: `Closed Loop Demo Asset ${i + 1}`, assetType: 'SAAS', lifecycleStatus: 'RETIRE_CANDIDATE',
      ownerUserId: 'jane.doe', businessCapability: 'Closed Loop Demo', outcomeIds,
      evidenceRefs: ['demo-fixture://closed-loop'], sourceSystems: ['demo-seed'],
    });
    closedLoopAssetIds.push(asset.id);

    const pkg = await recommendationOrchestrationService.buildExecutionPackage(tenantId, asset.id);
    if (!pkg) continue;
    const recommendationId = pkg.plan.recommendationId;

    if (step.approval) {
      const workflow = createWorkflow({ tenantId, targetType: 'RECOMMENDATION', targetId: recommendationId, workflowName: 'Demo approval', riskClass: 'B' });
      saveApprovalWorkflow({ ...workflow, approvalState: step.approval });
    }
    if (step.plan) {
      const plan = await governedExecutionService.createPlanFromRecommendation(tenantId, recommendationId);
      const updated: GovernedExecutionPlan = { ...plan, status: step.plan, updatedAt: new Date().toISOString() };
      await governedExecutionService.repo.upsertPlan(updated);
      if (step.verification) {
        const verification: GovernedExecutionVerification = {
          id: `gexec-verification-${randomUUID()}`, tenantId, planId: updated.id, status: step.verification, verificationType: 'STATE_CHANGED', evidenceRefs: [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        await governedExecutionService.repo.upsertVerification(verification);
      }
    }
    if (step.protect && outcomeIds[0]) {
      await outcomeProtectionService.protectOutcome({ tenantId, outcomeId: outcomeIds[0], assetId: asset.id, name: 'Demo protection', valueType: 'SAVINGS' });
    }
    await closedLoopOptimisationService.buildOptimisation(tenantId, asset.id);
  }

  // PX0.8 — Proof packs: built purely from whatever real evidence the seed
  // above produced, so readiness genuinely varies pack-to-pack.
  const proofPackService = new ExecutiveProofPackService();
  const packs = await proofPackService.buildAllProofPacks(tenantId);

  return {
    tenantId,
    vendorCount: VENDORS.length,
    assetCount,
    contractLinkCount,
    aiInitiativeCount,
    closedLoopAssetIds,
    proofPackCount: packs.length,
  };
}
