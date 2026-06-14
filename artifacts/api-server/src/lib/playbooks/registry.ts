import type { BasePlaybook } from "./base-playbook";
import { m365InactiveUserReclaimPlaybook } from "./m365-inactive-user-reclaim";
import { adobeContractorCleanupPlaybook, adobeInactiveLicenseReclaimPlaybook } from "./adobe-phase-a-playbooks";
import { atlassianAdminAccessReview, atlassianGroupAssignmentReview, atlassianInactiveConfluenceReclaim, atlassianInactiveJiraReclaim, atlassianInactiveJsmReclaim, atlassianInactiveOpsgenieReclaim, atlassianMarketplaceReview, atlassianSiteMembershipReview } from "./atlassian-phase-a-playbooks";
import { adobeAcrobatProRightsize, adobeAllAppsToSingleAppRightsize, adobeFireflyCreditsReview, adobeFrameIoReclaim, adobeLowUsageCreativeCloudRightsize, adobeSignAddonReview, adobeStockAddonReclaim, adobeStorageGovernanceReview, adobeSubstanceReclaim, adobeVideoSuiteRightsize } from "./adobe-phase-b-playbooks";
import {
  addonLicenseReclaimPlaybook,
  copilotUnderuseReallocationPlaybook,
  disabledLicensedUserReclaimPlaybook,
  e3WithoutDesktopAppsRightsizePlaybook,
  e5UnderusedRightsizePlaybook,
  inactiveUserReclaimPlaybook,
  overlappingSkuCleanupPlaybook,
  sharedMailboxLicenseReclaimPlaybook,
  serviceAccountLicenseReviewPlaybook,
  frontlineFitRightsizePlaybook,
  storageCostExposurePlaybook,
  renewalReadinessPackPlaybook,
} from "./m365-multi-playbooks";

export const PLAYBOOK_REGISTRY: BasePlaybook[] = [
  m365InactiveUserReclaimPlaybook,
  inactiveUserReclaimPlaybook,
  disabledLicensedUserReclaimPlaybook,
  e3WithoutDesktopAppsRightsizePlaybook,
  e5UnderusedRightsizePlaybook,
  addonLicenseReclaimPlaybook,
  copilotUnderuseReallocationPlaybook,
  sharedMailboxLicenseReclaimPlaybook,
  serviceAccountLicenseReviewPlaybook,
  frontlineFitRightsizePlaybook,
  storageCostExposurePlaybook,
  renewalReadinessPackPlaybook,
  overlappingSkuCleanupPlaybook,
  adobeInactiveLicenseReclaimPlaybook,
  adobeContractorCleanupPlaybook,
  adobeAllAppsToSingleAppRightsize,
  adobeAcrobatProRightsize,
  adobeVideoSuiteRightsize,
  adobeLowUsageCreativeCloudRightsize,
  adobeStockAddonReclaim,
  adobeFireflyCreditsReview,
  adobeFrameIoReclaim,
  adobeSubstanceReclaim,
  adobeSignAddonReview,
  adobeStorageGovernanceReview,
  atlassianInactiveJiraReclaim,
  atlassianInactiveConfluenceReclaim,
  atlassianInactiveJsmReclaim,
  atlassianInactiveOpsgenieReclaim,
  atlassianAdminAccessReview,
  atlassianGroupAssignmentReview,
  atlassianSiteMembershipReview,
  atlassianMarketplaceReview,
];

// Registered Atlassian playbook IDs (kept in sync with the entries above):
// ATLASSIAN_INACTIVE_JIRA_RECLAIM, ATLASSIAN_INACTIVE_CONFLUENCE_RECLAIM,
// ATLASSIAN_INACTIVE_JSM_RECLAIM, ATLASSIAN_INACTIVE_OPSGENIE_RECLAIM,
// ATLASSIAN_ADMIN_ACCESS_REVIEW, ATLASSIAN_GROUP_ASSIGNMENT_REVIEW,
// ATLASSIAN_SITE_MEMBERSHIP_REVIEW, ATLASSIAN_MARKETPLACE_REVIEW
export const ATLASSIAN_PLAYBOOK_IDS = [
  "ATLASSIAN_INACTIVE_JIRA_RECLAIM",
  "ATLASSIAN_INACTIVE_CONFLUENCE_RECLAIM",
  "ATLASSIAN_INACTIVE_JSM_RECLAIM",
  "ATLASSIAN_INACTIVE_OPSGENIE_RECLAIM",
  "ATLASSIAN_ADMIN_ACCESS_REVIEW",
  "ATLASSIAN_GROUP_ASSIGNMENT_REVIEW",
  "ATLASSIAN_SITE_MEMBERSHIP_REVIEW",
  "ATLASSIAN_MARKETPLACE_REVIEW",
] as const;
