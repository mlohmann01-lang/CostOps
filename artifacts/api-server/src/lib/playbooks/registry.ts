import type { BasePlaybook } from "./base-playbook";
import { m365InactiveUserReclaimPlaybook } from "./m365-inactive-user-reclaim";
import {
  disabledLicensedUserReclaimPlaybook,
  e5ToE3RightsizingPlaybook,
  sharedMailboxConversionPlaybook,
  unusedAddonReclaimPlaybook,
  webOnlyF3CandidatePlaybook,
} from "./m365-multi-playbooks";

export const PLAYBOOK_REGISTRY: BasePlaybook[] = [
  m365InactiveUserReclaimPlaybook,
  disabledLicensedUserReclaimPlaybook,
  sharedMailboxConversionPlaybook,
  e5ToE3RightsizingPlaybook,
  webOnlyF3CandidatePlaybook,
  unusedAddonReclaimPlaybook,
];
