import type { BasePlaybook } from "./base-playbook";
import { m365InactiveUserReclaimPlaybook } from "./m365-inactive-user-reclaim";
import {
  addonLicenseReclaimPlaybook,
  copilotUnderuseReallocationPlaybook,
  disabledLicensedUserReclaimPlaybook,
  e3WithoutDesktopAppsRightsizePlaybook,
  e5UnderusedRightsizePlaybook,
  inactiveUserReclaimPlaybook,
  overlappingSkuCleanupPlaybook,
  sharedMailboxLicenseReclaimPlaybook,
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
  overlappingSkuCleanupPlaybook,
];
