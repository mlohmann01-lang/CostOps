import { buildGovernedRecommendation } from '../../recommendations/recommendation-builder';
import type { GovernedRecommendationObject, ActionRiskClass } from '../../recommendations/types';
import type { DiscoveryLifecycleState } from '../../discovery-intelligence/types';

export type CopilotAction = 'RECLAIM_COPILOT_LICENSE' | 'REALLOCATE_COPILOT_LICENSE' | 'REVIEW_COPILOT_ALLOCATION';

export type M365CopilotUtilisationSignal = {
  tenantId: string;
  userId: string;
  userPrincipalName: string;
  assignedCopilotSku?: string;
  copilotUsageLevel?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  copilotUsageSignals: string[];
  m365AppUsageBaseline?: string;
  department?: string;
  costCentre?: string;
  personaFit?: 'STRONG' | 'MEDIUM' | 'WEAK' | 'UNKNOWN';
  lastActivityDate?: string;
  businessJustificationSignal?: string;
  sourceReferences: string[];
  projectedMonthlySavingsOrValue: number;
  lifecycleState: DiscoveryLifecycleState;
  conflictingEntitlementData?: boolean;
  isVip?: boolean;
  legalHold?: boolean;
  complianceSensitive?: boolean;
  pilotGroupParticipant?: boolean;
  explicitException?: boolean;
  protectedDepartmentOrRole?: boolean;
  accountEnabled?: boolean;
  isInactive?: boolean;
  highDemandDepartmentNeedsAllocation?: boolean;
};

export function buildM365CopilotUtilisationGovernedRecommendation(signal: M365CopilotUtilisationSignal): { recommendation: GovernedRecommendationObject | null; excludedReasons: string[] } {
  const excludedReasons: string[] = [];
  if (signal.isVip) excludedReasons.push('executive/VIP');
  if (signal.legalHold || signal.complianceSensitive) excludedReasons.push('legal hold / compliance-sensitive user');
  if (signal.pilotGroupParticipant) excludedReasons.push('active pilot group participant');
  if (signal.explicitException) excludedReasons.push('explicit exception');
  if (!signal.copilotUsageSignals?.length) excludedReasons.push('missing usage data');
  if (!signal.personaFit || signal.personaFit === 'UNKNOWN') excludedReasons.push('unknown persona');
  if (signal.lifecycleState !== 'TRUSTED') excludedReasons.push('untrusted lifecycle');
  if (signal.conflictingEntitlementData) excludedReasons.push('conflicting entitlement data');
  if (signal.protectedDepartmentOrRole) excludedReasons.push('protected department / role');
  if (!signal.assignedCopilotSku) excludedReasons.push('Copilot SKU required');
  if (Number(signal.projectedMonthlySavingsOrValue ?? 0) <= 0) excludedReasons.push('savings/reallocation value required');
  if (excludedReasons.length > 0) return { recommendation: null, excludedReasons };

  const inactiveOrDisabled = signal.accountEnabled === false || signal.isInactive === true;
  let actionType: CopilotAction = 'REVIEW_COPILOT_ALLOCATION';
  if (inactiveOrDisabled || signal.copilotUsageLevel === 'NONE') actionType = 'RECLAIM_COPILOT_LICENSE';
  else if (signal.highDemandDepartmentNeedsAllocation && (signal.copilotUsageLevel === 'LOW' || signal.personaFit === 'WEAK')) actionType = 'REALLOCATE_COPILOT_LICENSE';
  else if (signal.copilotUsageLevel === 'LOW') actionType = 'RECLAIM_COPILOT_LICENSE';

  const riskClass: ActionRiskClass = actionType === 'REVIEW_COPILOT_ALLOCATION' ? 'A' : actionType === 'REALLOCATE_COPILOT_LICENSE' && signal.protectedDepartmentOrRole ? 'C' : 'B';
  const evidencePointers = [
    `m365:copilot-sku:${signal.assignedCopilotSku}`,
    `m365:copilot-usage-level:${signal.copilotUsageLevel ?? 'UNKNOWN'}`,
    ...signal.copilotUsageSignals.map((s) => `m365:copilot-usage:${s}`),
    `m365:app-baseline:${signal.m365AppUsageBaseline ?? 'UNKNOWN'}`,
    `department:${signal.department ?? 'UNKNOWN'}`,
    `cost-centre:${signal.costCentre ?? 'UNKNOWN'}`,
    `persona-fit:${signal.personaFit}`,
    ...(signal.lastActivityDate ? [`last-activity:${signal.lastActivityDate}`] : []),
    ...(signal.businessJustificationSignal ? [`business-justification:${signal.businessJustificationSignal}`] : []),
    ...signal.sourceReferences.map((s) => `source:${s}`),
  ];

  const recommendation = buildGovernedRecommendation({
    recommendationId: `${signal.tenantId}:${signal.userId}:M365_COPILOT_UTILISATION_V1`,
    tenantId: signal.tenantId,
    playbookId: 'M365_COPILOT_UTILISATION_V1',
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
    manualOnly: actionType === 'REVIEW_COPILOT_ALLOCATION',
  });

  if (actionType === 'REVIEW_COPILOT_ALLOCATION') {
    return { recommendation: { ...recommendation, executionReadiness: 'MANUAL_ONLY', recommendationState: 'EVIDENCE_READY', readinessReasons: Array.from(new Set([...(recommendation.readinessReasons ?? []), 'REVIEW_ONLY_ACTION_NOT_EXECUTABLE_V1', 'AUTO_EXECUTE_SAFE_DISABLED_V1'])) }, excludedReasons: [] };
  }

  return { recommendation: { ...recommendation, executionReadiness: 'APPROVAL_REQUIRED', recommendationState: 'APPROVAL_REQUIRED', readinessReasons: Array.from(new Set([...(recommendation.readinessReasons ?? []), 'APPROVAL_REQUIRED_ALWAYS_V1', 'AUTO_EXECUTE_SAFE_DISABLED_V1'])) }, excludedReasons: [] };
}
