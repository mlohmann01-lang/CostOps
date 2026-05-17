import type { BasePlaybook } from "./base-playbook";
import { m365InactiveUserReclaimPlaybook } from "./m365-inactive-user-reclaim";
import { adobeContractorCleanupPlaybook, adobeInactiveLicenseReclaimPlaybook } from "./adobe-phase-a-playbooks";
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
];
