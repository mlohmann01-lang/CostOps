import type { BasePlaybook } from "./base-playbook";
import { m365InactiveUserReclaimPlaybook } from "./m365-inactive-user-reclaim";

export const PLAYBOOK_REGISTRY: BasePlaybook[] = [m365InactiveUserReclaimPlaybook];
