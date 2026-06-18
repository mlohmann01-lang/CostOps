import { createHash } from 'node:crypto';
import { buildGovernedRecommendation } from '../../recommendations/recommendation-builder';
import type { GovernedRecommendationObject } from '../../recommendations/types';
import type { FlexeraDiscoveryResult } from '../../production-connectors/flexera/flexera-types';

export type FlexeraRecommendationType =
  | 'UNUSED_LICENSE'
  | 'UNDERUTILISED_LICENSE'
  | 'DUPLICATE_CAPABILITY'
  | 'ORPHANED_ASSET'
  | 'RENEWAL_REVIEW_REQUIRED';

const UNDERUTILISED_THRESHOLD = 50;
const RENEWAL_WINDOW_DAYS = 90;
const SEAT_VALUE_ESTIMATE = 10;

function deterministicId(tenantId: string, kind: FlexeraRecommendationType, entityId: string) {
  const hash = createHash('sha256').update(`${tenantId}|FLEXERA|${kind}|${entityId}`).digest('hex').slice(0, 16);
  return `${tenantId}:flexera:${kind.toLowerCase()}:${entityId}:${hash}`;
}

function make(input: {
  tenantId: string;
  kind: FlexeraRecommendationType;
  entityId: string;
  entityType: string;
  monthlySavings: number;
  evidencePointers: string[];
  confidenceScore: number;
}): GovernedRecommendationObject {
  return buildGovernedRecommendation({
    recommendationId: deterministicId(input.tenantId, input.kind, input.entityId),
    tenantId: input.tenantId,
    playbookId: `flexera-${input.kind.toLowerCase().replace(/_/g, '-')}`,
    targetEntityId: input.entityId,
    targetEntityType: input.entityType,
    graphNodeIds: [],
    graphEdgeIds: [],
    discoveryLifecycleState: 'TRUSTED',
    confidenceScore: input.confidenceScore,
    reliabilityBand: input.confidenceScore >= 0.8 ? 'HIGH' : input.confidenceScore >= 0.5 ? 'MEDIUM' : 'LOW',
    projectedMonthlySavings: Number(input.monthlySavings.toFixed(2)),
    projectedAnnualSavings: Number((input.monthlySavings * 12).toFixed(2)),
    savingsConfidence: input.confidenceScore >= 0.8 ? 'HIGH' : input.confidenceScore >= 0.5 ? 'MEDIUM' : 'LOW',
    actionType: input.kind,
    actionRiskClass: 'A',
    evidencePointers: input.evidencePointers,
    recommendationSource: 'DISCOVERY',
    manualOnly: true,
  });
}

export function generateFlexeraRecommendations(result: FlexeraDiscoveryResult): { recommendations: GovernedRecommendationObject[]; summary: { entitiesEvaluated: number; recommendationsGenerated: number } } {
  const tenantId = result.tenantId;
  const recs: GovernedRecommendationObject[] = [];
  const evidence = result.evidenceRefs;

  for (const entitlement of result.entitlements) {
    const consumption = result.consumption.find((c) => c.applicationId === entitlement.productId);
    if (consumption && consumption.activeUsers === 0) {
      recs.push(make({ tenantId, kind: 'UNUSED_LICENSE', entityId: entitlement.id, entityType: 'FLEXERA_ENTITLEMENT', monthlySavings: entitlement.purchased * SEAT_VALUE_ESTIMATE, evidencePointers: evidence, confidenceScore: 0.9 }));
    } else if (consumption && consumption.utilisationPercent < UNDERUTILISED_THRESHOLD) {
      recs.push(make({ tenantId, kind: 'UNDERUTILISED_LICENSE', entityId: entitlement.id, entityType: 'FLEXERA_ENTITLEMENT', monthlySavings: entitlement.available * SEAT_VALUE_ESTIMATE * 0.5, evidencePointers: evidence, confidenceScore: 0.75 }));
    }
  }

  const appsByName = new Map<string, typeof result.applications>();
  for (const app of result.applications) appsByName.set(app.name, [...(appsByName.get(app.name) ?? []), app]);
  for (const [, apps] of appsByName) {
    if (apps.length > 1) {
      for (const app of apps) recs.push(make({ tenantId, kind: 'DUPLICATE_CAPABILITY', entityId: app.id, entityType: 'FLEXERA_APPLICATION', monthlySavings: 0, evidencePointers: evidence, confidenceScore: 0.6 }));
    }
    for (const app of apps) {
      if (!app.owner) recs.push(make({ tenantId, kind: 'ORPHANED_ASSET', entityId: app.id, entityType: 'FLEXERA_APPLICATION', monthlySavings: 0, evidencePointers: evidence, confidenceScore: 0.65 }));
    }
  }

  for (const renewal of result.renewals) {
    const days = (Date.parse(renewal.renewalDate) - Date.now()) / 86400000;
    if (days >= 0 && days <= RENEWAL_WINDOW_DAYS) {
      recs.push(make({ tenantId, kind: 'RENEWAL_REVIEW_REQUIRED', entityId: renewal.contractId, entityType: 'FLEXERA_CONTRACT', monthlySavings: 0, evidencePointers: evidence, confidenceScore: 0.85 }));
    }
  }

  const dedup = new Map<string, GovernedRecommendationObject>();
  for (const r of recs) dedup.set(r.recommendationId, r);
  return { recommendations: [...dedup.values()], summary: { entitiesEvaluated: result.entitlements.length + result.applications.length + result.renewals.length, recommendationsGenerated: dedup.size } };
}
