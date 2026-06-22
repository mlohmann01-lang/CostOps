// Program AI2 — Capability 9: AI Initiative Portfolio Authority.
//
// Tenant-scoped. Measures portfolio quality across Coverage, Ownership,
// Outcome Coverage, Confidence and Governance — purely from data already
// persisted by this module and AI1's attribution outputs. Never fabricates a
// verdict: zero initiatives is reported honestly as NOT_READY.

import { aiInitiativePortfolioRepository } from './ai-initiative-portfolio-repository';
import { aiInitiativePortfolioService } from './ai-initiative-portfolio-service';
import type { AIInitiativePortfolioAuthorityResult } from './ai-initiative-portfolio-types';

export async function getAIInitiativePortfolioAuthority(tenantId: string): Promise<AIInitiativePortfolioAuthorityResult> {
  const initiatives = await aiInitiativePortfolioRepository.listInitiatives(tenantId);

  if (initiatives.length === 0) {
    return {
      authority: 'AI_INITIATIVE_PORTFOLIO_AUTHORITY',
      tenantId,
      verdict: 'NOT_READY',
      score: 0,
      coverage: { assetCount: 0, assetsInInitiatives: 0, ratio: 0 },
      ownership: { initiativeCount: 0, ownedInitiatives: 0, ratio: 0 },
      outcomeCoverage: { initiativeCount: 0, initiativesWithOutcomes: 0, ratio: 0 },
      confidence: { averageScore: 0 },
      governance: { initiativeCount: 0, lifecycleCompliant: 0, ratio: 0 },
      reasoning: 'No AI initiatives exist for this tenant; portfolio readiness cannot be claimed without data.',
    };
  }

  const assetLinks = await aiInitiativePortfolioRepository.listAssetLinks(tenantId);
  const distinctAssets = new Set(assetLinks.map((l) => l.assetId));
  const assetCount = distinctAssets.size;
  const assetsInInitiatives = distinctAssets.size;
  const coverageRatio = assetCount > 0 ? assetsInInitiatives / assetCount : 0;

  const ownerships = await Promise.all(initiatives.map((i) => aiInitiativePortfolioService.evaluateOwnership(tenantId, i.id)));
  const ownedInitiatives = ownerships.filter((o) => o.hasOwner).length;
  const ownershipRatio = ownedInitiatives / initiatives.length;

  const outcomeSummaries = await Promise.all(initiatives.map((i) => aiInitiativePortfolioService.getInitiativeOutcomeSummary(tenantId, i.id)));
  const initiativesWithOutcomes = outcomeSummaries.filter((s) => s.outcomeCount > 0).length;
  const outcomeCoverageRatio = initiativesWithOutcomes / initiatives.length;

  const confidences = await Promise.all(initiatives.map((i) => aiInitiativePortfolioService.getInitiativeConfidence(tenantId, i.id)));
  const averageConfidenceScore = confidences.length ? confidences.reduce((sum, c) => sum + c.score, 0) / confidences.length : 0;

  const governanceChecks = await Promise.all(initiatives.map(async (i) => {
    if (!i.lifecycle) return true;
    if (i.lifecycle === 'OPERATIONAL') return ownerships.find((o) => o.initiativeId === i.id)?.hasOwner ?? false;
    if (i.lifecycle === 'SCALING') return (outcomeSummaries.find((s) => s.initiativeId === i.id)?.outcomeCount ?? 0) > 0;
    return true;
  }));
  const lifecycleCompliant = governanceChecks.filter(Boolean).length;
  const governanceRatio = lifecycleCompliant / initiatives.length;

  const score = Math.round(
    (coverageRatio * 20) + (ownershipRatio * 25) + (outcomeCoverageRatio * 20) + (Math.min(1, averageConfidenceScore / 100) * 20) + (governanceRatio * 15),
  );

  const verdict = score >= 80 ? 'READY' : score >= 40 ? 'PARTIAL' : 'NOT_READY';

  const reasoning = `${verdict} (${score}/100). Coverage: ${assetsInInitiatives}/${assetCount || 0} linked assets (${Math.round(coverageRatio * 100)}%). `
    + `Ownership: ${ownedInitiatives}/${initiatives.length} initiatives owned (${Math.round(ownershipRatio * 100)}%). `
    + `Outcome coverage: ${initiativesWithOutcomes}/${initiatives.length} initiatives have outcomes (${Math.round(outcomeCoverageRatio * 100)}%). `
    + `Confidence: average score ${Math.round(averageConfidenceScore)}. `
    + `Governance: ${lifecycleCompliant}/${initiatives.length} initiatives satisfy lifecycle rules (${Math.round(governanceRatio * 100)}%).`;

  return {
    authority: 'AI_INITIATIVE_PORTFOLIO_AUTHORITY',
    tenantId,
    verdict,
    score,
    coverage: { assetCount, assetsInInitiatives, ratio: Math.round(coverageRatio * 1000) / 1000 },
    ownership: { initiativeCount: initiatives.length, ownedInitiatives, ratio: Math.round(ownershipRatio * 1000) / 1000 },
    outcomeCoverage: { initiativeCount: initiatives.length, initiativesWithOutcomes, ratio: Math.round(outcomeCoverageRatio * 1000) / 1000 },
    confidence: { averageScore: Math.round(averageConfidenceScore * 100) / 100 },
    governance: { initiativeCount: initiatives.length, lifecycleCompliant, ratio: Math.round(governanceRatio * 1000) / 1000 },
    reasoning,
  };
}
