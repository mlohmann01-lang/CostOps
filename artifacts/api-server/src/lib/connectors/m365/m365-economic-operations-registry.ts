import type { TenantOperationalMode } from '../../economic-operations-intent-service';

export type M365EconomicRecommendationType =
  | 'LICENSE_RECLAIM'
  | 'LICENSE_REVIEW'
  | 'LICENSE_RIGHTSIZE_REVIEW'
  | 'LICENSE_TIER_DOWNGRADE'
  | 'ADDON_RECLAIM'
  | 'COPILOT_RECLAIM'
  | 'COPILOT_REVIEW'
  | 'COPILOT_REALLOCATE'
  | 'LICENSE_OVERLAP_ELIMINATION';

export type M365PlaybookDefinition = {
  playbookId: string;
  recommendationType: M365EconomicRecommendationType;
  riskClass: 'A' | 'B' | 'C';
  approvalRequirement: 'REQUIRED' | 'RECOMMENDED';
  rollbackSupport: boolean;
  verificationStrategy: string;
  driftStrategy: string;
  executionCapabilities: string[];
  minimumTenantMode: TenantOperationalMode;
  simulationSupport: boolean;
  expectedSavingsConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
  blastRadiusClass: 'LOW' | 'MEDIUM' | 'HIGH';
};

export const M365_LICENSE_PRICING_CATALOG = {
  E5: 57,
  E3: 36,
  F3: 8,
  COPILOT: 30,
} as const;

export const M365_SERVICE_PLAN_USAGE_MODEL = {
  e5Signals: ['defender', 'purview', 'phoneSystem', 'powerBIPro'],
  addonSignals: ['visio', 'project', 'audioConferencing', 'fabric', 'copilot'],
} as const;

export const M365_FEATURE_UTILIZATION_CLASSIFIER = {
  classifyTierNeed: (usageScore: number) => (usageScore >= 0.7 ? 'E5_REQUIRED' : usageScore >= 0.4 ? 'E3_FIT' : 'RIGHTSIZE_CANDIDATE'),
  classifyAddonNeed: (usageScore: number) => (usageScore >= 0.5 ? 'KEEP' : 'RECLAIM_REVIEW'),
} as const;

export const M365_PLAYBOOK_REGISTRY: Record<string, M365PlaybookDefinition> = {
  'm365-disabled-licensed-user-reclaim': {
    playbookId: 'm365-disabled-licensed-user-reclaim', recommendationType: 'LICENSE_RECLAIM', riskClass: 'B', approvalRequirement: 'REQUIRED', rollbackSupport: true, verificationStrategy: 'POST_EXECUTION_LICENSE_RECONCILIATION', driftStrategy: 'LICENSE_REASSIGNMENT_MONITORING', executionCapabilities: ['REMOVE_LICENSE', 'ASSIGN_LICENSE'], minimumTenantMode: 'PRODUCTION_APPROVAL_REQUIRED', simulationSupport: true, expectedSavingsConfidence: 'HIGH', blastRadiusClass: 'MEDIUM',
  },
  'm365-inactive-user-rightsizing': {
    playbookId: 'm365-inactive-user-rightsizing', recommendationType: 'LICENSE_RIGHTSIZE_REVIEW', riskClass: 'B', approvalRequirement: 'RECOMMENDED', rollbackSupport: true, verificationStrategy: 'POST_RIGHTSIZE_USAGE_AND_ASSIGNMENT_CHECK', driftStrategy: 'RELICENSED_OR_UPGRADED_MONITORING', executionCapabilities: ['DOWNGRADE_LICENSE', 'REMOVE_ADDON', 'ASSIGN_LICENSE'], minimumTenantMode: 'PILOT_APPROVAL_REQUIRED', simulationSupport: true, expectedSavingsConfidence: 'MEDIUM', blastRadiusClass: 'MEDIUM',
  },
  'm365-e5-to-e3-downgrade': {
    playbookId: 'm365-e5-to-e3-downgrade', recommendationType: 'LICENSE_TIER_DOWNGRADE', riskClass: 'B', approvalRequirement: 'REQUIRED', rollbackSupport: true, verificationStrategy: 'SERVICE_PLAN_CAPABILITY_RECONCILIATION', driftStrategy: 'UPGRADE_REASSIGNMENT_MONITORING', executionCapabilities: ['DOWNGRADE_LICENSE', 'ASSIGN_LICENSE'], minimumTenantMode: 'PRODUCTION_APPROVAL_REQUIRED', simulationSupport: true, expectedSavingsConfidence: 'MEDIUM', blastRadiusClass: 'MEDIUM',
  },
  'm365-addon-reclaim': {
    playbookId: 'm365-addon-reclaim', recommendationType: 'ADDON_RECLAIM', riskClass: 'A', approvalRequirement: 'REQUIRED', rollbackSupport: true, verificationStrategy: 'ADDON_ASSIGNMENT_AND_USAGE_RECONCILIATION', driftStrategy: 'ADDON_REASSIGNMENT_MONITORING', executionCapabilities: ['REMOVE_LICENSE', 'ASSIGN_LICENSE'], minimumTenantMode: 'PILOT_APPROVAL_REQUIRED', simulationSupport: true, expectedSavingsConfidence: 'MEDIUM', blastRadiusClass: 'LOW',
  },
  'm365-copilot-reclamation-governance': {
    playbookId: 'm365-copilot-reclamation-governance', recommendationType: 'COPILOT_REVIEW', riskClass: 'C', approvalRequirement: 'REQUIRED', rollbackSupport: true, verificationStrategy: 'COPILOT_ACTIVITY_AND_ASSIGNMENT_RECON', driftStrategy: 'COPILOT_REASSIGNMENT_MONITORING', executionCapabilities: ['REMOVE_LICENSE', 'ASSIGN_LICENSE', 'REALLOCATE_LICENSE'], minimumTenantMode: 'PRODUCTION_APPROVAL_REQUIRED', simulationSupport: true, expectedSavingsConfidence: 'MEDIUM', blastRadiusClass: 'HIGH',
  },
  'm365-license-overlap-elimination': {
    playbookId: 'm365-license-overlap-elimination', recommendationType: 'LICENSE_OVERLAP_ELIMINATION', riskClass: 'C', approvalRequirement: 'REQUIRED', rollbackSupport: true, verificationStrategy: 'OVERLAP_SERVICE_PLAN_EQUIVALENCY_RECON', driftStrategy: 'OVERLAP_REOCCURRENCE_MONITORING', executionCapabilities: ['REMOVE_LICENSE', 'ASSIGN_LICENSE'], minimumTenantMode: 'PRODUCTION_APPROVAL_REQUIRED', simulationSupport: true, expectedSavingsConfidence: 'LOW', blastRadiusClass: 'HIGH',
  },
};

export const M365_ECONOMIC_PLAYBOOK_IDS = Object.keys(M365_PLAYBOOK_REGISTRY);
