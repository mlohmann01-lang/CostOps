import { buildGovernedRecommendation } from '../../recommendations/recommendation-builder';
import type { GovernedRecommendationObject, ActionRiskClass } from '../../recommendations/types';
import type { DiscoveryLifecycleState } from '../../discovery-intelligence/types';

export type AddOnAction = 'RECLAIM_ADDON_LICENSE' | 'REALLOCATE_ADDON_LICENSE' | 'REVIEW_ADDON_ALLOCATION';

export type M365AddonReclamationSignal = {
  tenantId: string;
  userId: string;
  userPrincipalName: string;
  addonSku?: string;
  baseSku?: string;
  assignmentState?: 'ASSIGNED' | 'UNASSIGNED' | 'UNKNOWN';
  usageLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  usageSignals: string[];
  overlapEvidence?: string;
  duplicateEntitlement?: boolean;
  baseSkuEligible?: boolean;
  personaFit?: 'STRONG' | 'MEDIUM' | 'WEAK' | 'UNKNOWN';
  department?: string;
  costCentre?: string;
  lastActivityDate?: string;
  sourceReferences: string[];
  projectedMonthlySavingsOrValue: number;
  lifecycleState: DiscoveryLifecycleState;
  conflictingEntitlementData?: boolean;
  isVip?: boolean;
  complianceSensitive?: boolean;
  legalHold?: boolean;
  pilotGroupParticipant?: boolean;
  explicitException?: boolean;
  protectedDepartmentOrRole?: boolean;
  accountEnabled?: boolean;
  isInactive?: boolean;
  policySeverityHigh?: boolean;
};

export function buildM365AddonReclamationGovernedRecommendation(signal: M365AddonReclamationSignal): { recommendation: GovernedRecommendationObject | null; excludedReasons: string[] } {
  const excludedReasons: string[] = [];
  if (signal.isVip) excludedReasons.push('VIP/executive');
  if (signal.complianceSensitive) excludedReasons.push('compliance-sensitive');
  if (signal.legalHold) excludedReasons.push('legal hold');
  if (signal.pilotGroupParticipant) excludedReasons.push('active pilot group');
  if (signal.explicitException) excludedReasons.push('explicit exception');
  if (signal.protectedDepartmentOrRole) excludedReasons.push('protected department/role');
  if (!signal.usageSignals?.length) excludedReasons.push('missing usage data');
  if (!signal.personaFit || signal.personaFit === 'UNKNOWN') excludedReasons.push('unknown persona');
  if (signal.lifecycleState !== 'TRUSTED') excludedReasons.push('untrusted lifecycle');
  if (signal.conflictingEntitlementData) excludedReasons.push('conflicting entitlement data');
  if (!signal.addonSku) excludedReasons.push('add-on SKU required');
  if (!signal.assignmentState || signal.assignmentState === 'UNKNOWN') excludedReasons.push('assignment evidence required');
  if (Number(signal.projectedMonthlySavingsOrValue ?? 0) <= 0) excludedReasons.push('value/savings required');
  if (excludedReasons.length > 0) return { recommendation: null, excludedReasons };

  const inactiveOrDisabled = signal.accountEnabled === false || signal.isInactive === true;
  let actionType: AddOnAction = 'REVIEW_ADDON_ALLOCATION';
  if (inactiveOrDisabled || signal.usageLevel === 'NONE') actionType = 'RECLAIM_ADDON_LICENSE';
  else if (signal.duplicateEntitlement || signal.overlapEvidence || signal.baseSkuEligible === false || (signal.usageLevel === 'LOW' && signal.personaFit === 'WEAK')) actionType = 'REALLOCATE_ADDON_LICENSE';
  else if (signal.usageLevel === 'LOW') actionType = 'RECLAIM_ADDON_LICENSE';

  const riskClass: ActionRiskClass = actionType === 'REVIEW_ADDON_ALLOCATION' ? 'A' : actionType === 'REALLOCATE_ADDON_LICENSE' && signal.policySeverityHigh ? 'C' : 'B';

  const evidencePointers = [
    `m365:addon-sku:${signal.addonSku}`,
    `m365:base-sku:${signal.baseSku ?? 'UNKNOWN'}`,
    `m365:assignment-state:${signal.assignmentState}`,
    `m365:usage-level:${signal.usageLevel ?? 'UNKNOWN'}`,
    ...signal.usageSignals.map((s) => `m365:usage:${s}`),
    ...(signal.overlapEvidence ? [`m365:overlap:${signal.overlapEvidence}`] : []),
    `persona-fit:${signal.personaFit}`,
    `department:${signal.department ?? 'UNKNOWN'}`,
    `cost-centre:${signal.costCentre ?? 'UNKNOWN'}`,
    ...(signal.lastActivityDate ? [`last-activity:${signal.lastActivityDate}`] : []),
    ...signal.sourceReferences.map((s) => `source:${s}`),
  ];

  const recommendation = buildGovernedRecommendation({
    recommendationId: `${signal.tenantId}:${signal.userId}:M365_ADDON_RECLAMATION_V1`,
    tenantId: signal.tenantId,
    playbookId: 'M365_ADDON_RECLAMATION_V1',
    targetEntityId: signal.userId,
    targetEntityType: 'User',
    graphNodeIds: [],
    graphEdgeIds: [],
    discoveryLifecycleState: signal.lifecycleState,
    confidenceScore: signal.personaFit === 'STRONG' ? 0.88 : signal.personaFit === 'MEDIUM' ? 0.78 : 0.7,
    reliabilityBand: 'MEDIUM',
    projectedMonthlySavings: signal.projectedMonthlySavingsOrValue,
    projectedAnnualSavings: signal.projectedMonthlySavingsOrValue * 12,
    savingsConfidence: 'MEDIUM',
    actionType,
    actionRiskClass: riskClass,
    evidencePointers,
    hasApproval: false,
    manualOnly: actionType === 'REVIEW_ADDON_ALLOCATION',
  });

  if (actionType === 'REVIEW_ADDON_ALLOCATION') {
    return { recommendation: { ...recommendation, executionReadiness: 'MANUAL_ONLY', recommendationState: 'EVIDENCE_READY', readinessReasons: Array.from(new Set([...(recommendation.readinessReasons ?? []), 'REVIEW_ONLY_ACTION_NOT_EXECUTABLE_V1', 'AUTO_EXECUTE_SAFE_DISABLED_V1'])) }, excludedReasons: [] };
  }

  return { recommendation: { ...recommendation, executionReadiness: 'APPROVAL_REQUIRED', recommendationState: 'APPROVAL_REQUIRED', readinessReasons: Array.from(new Set([...(recommendation.readinessReasons ?? []), 'APPROVAL_REQUIRED_ALWAYS_V1', 'AUTO_EXECUTE_SAFE_DISABLED_V1'])) }, excludedReasons: [] };
}
