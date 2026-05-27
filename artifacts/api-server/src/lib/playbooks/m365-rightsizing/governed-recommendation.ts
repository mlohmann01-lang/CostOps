import { buildGovernedRecommendation } from '../../recommendations/recommendation-builder';
import type { GovernedRecommendationObject, ActionRiskClass } from '../../recommendations/types';
import type { DiscoveryLifecycleState } from '../../discovery-intelligence/types';

export type M365RightsizingSignal = {
  tenantId: string;
  userId: string;
  userPrincipalName: string;
  currentSku: string;
  proposedSku?: string;
  premiumAddOns?: string[];
  usageSignals: string[];
  personaFit?: 'E1' | 'F3' | 'WEB_ONLY' | 'E3' | 'E5' | 'UNKNOWN';
  lastActivityDate?: string;
  confidenceScore: number;
  sourceReferences: string[];
  projectedMonthlySavings: number;
  lifecycleState: DiscoveryLifecycleState;
  conflictingEntitlementData?: boolean;
  isAdmin?: boolean;
  isServiceAccount?: boolean;
  isSharedMailbox?: boolean;
  isVip?: boolean;
  legalHold?: boolean;
  complianceSensitive?: boolean;
};

export function buildM365RightsizingGovernedRecommendation(signal: M365RightsizingSignal): { recommendation: GovernedRecommendationObject | null; excludedReasons: string[] } {
  const excludedReasons: string[] = [];
  if (signal.isAdmin) excludedReasons.push('admin account');
  if (signal.isServiceAccount) excludedReasons.push('service account');
  if (signal.isSharedMailbox) excludedReasons.push('shared mailbox');
  if (signal.isVip) excludedReasons.push('executive/VIP');
  if (signal.legalHold || signal.complianceSensitive) excludedReasons.push('legal hold / compliance-sensitive user');
  if (!signal.usageSignals?.length) excludedReasons.push('missing usage data');
  if (!signal.proposedSku) excludedReasons.push('proposed SKU required');
  if (!signal.personaFit || signal.personaFit === 'UNKNOWN') excludedReasons.push('unknown persona');
  if (signal.lifecycleState !== 'TRUSTED') excludedReasons.push('untrusted lifecycle state');
  if (signal.conflictingEntitlementData) excludedReasons.push('conflicting entitlement data');
  if (Number(signal.projectedMonthlySavings ?? 0) <= 0) excludedReasons.push('savings must be positive');

  if (excludedReasons.length > 0) return { recommendation: null, excludedReasons };

  const lower = (signal.proposedSku ?? '').toUpperCase();
  const riskClass: ActionRiskClass = lower.includes('F3') || lower.includes('E1') ? 'B' : 'C';

  const evidencePointers = [
    `m365:current-sku:${signal.currentSku}`,
    `m365:proposed-sku:${signal.proposedSku}`,
    ...signal.usageSignals.map((s) => `m365:usage:${s}`),
    ...signal.sourceReferences.map((s) => `source:${s}`),
    `persona-fit:${signal.personaFit}`,
    ...(signal.lastActivityDate ? [`last-activity:${signal.lastActivityDate}`] : []),
  ];

  const recommendation = buildGovernedRecommendation({
    recommendationId: `${signal.tenantId}:${signal.userId}:M365_RIGHTSIZE_LICENSE_V1`,
    tenantId: signal.tenantId,
    playbookId: 'M365_RIGHTSIZE_LICENSE_V1',
    targetEntityId: signal.userId,
    targetEntityType: 'User',
    graphNodeIds: [],
    graphEdgeIds: [],
    discoveryLifecycleState: signal.lifecycleState,
    confidenceScore: signal.confidenceScore,
    reliabilityBand: signal.confidenceScore >= 0.85 ? 'HIGH' : signal.confidenceScore >= 0.7 ? 'MEDIUM' : 'LOW',
    projectedMonthlySavings: signal.projectedMonthlySavings,
    projectedAnnualSavings: signal.projectedMonthlySavings * 12,
    savingsConfidence: signal.confidenceScore >= 0.85 ? 'HIGH' : signal.confidenceScore >= 0.7 ? 'MEDIUM' : 'LOW',
    actionType: 'RIGHTSIZE_LICENSE',
    actionRiskClass: riskClass,
    evidencePointers,
    hasApproval: false,
  });

  return { recommendation: { ...recommendation, executionReadiness: 'APPROVAL_REQUIRED', recommendationState: 'APPROVAL_REQUIRED', readinessReasons: Array.from(new Set([...(recommendation.readinessReasons ?? []), 'APPROVAL_REQUIRED_ALWAYS_V1', 'AUTO_EXECUTE_SAFE_DISABLED_V1'])) }, excludedReasons: [] };
}
