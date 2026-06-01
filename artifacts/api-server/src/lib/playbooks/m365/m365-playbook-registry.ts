import type { M365Playbook } from './m365-playbook-types'
import { InactiveUserReclaimPlaybook } from './inactive-user-reclaim-playbook'
import { LicensePoolRecoveryPlaybook } from './license-pool-recovery-playbook'
import { CopilotRightsizingPlaybook } from './copilot-rightsizing-playbook'
import { SharedMailboxConversionPlaybook } from './shared-mailbox-conversion-playbook'
import { DuplicateLicensePlaybook } from './duplicate-license-playbook'
import { DormantGroupPlaybook } from './dormant-group-playbook'
import { SecuritySkuRationalizationPlaybook } from './security-sku-rationalization-playbook'

export class M365PlaybookRegistry {
  private readonly playbooks = new Map<string, M365Playbook>()
  register(playbook: M365Playbook) { this.playbooks.set(playbook.playbookId, playbook); return this }
  get(playbookId: string) { return this.playbooks.get(playbookId) ?? null }
  list() { return Array.from(this.playbooks.values()) }
}

export function buildDefaultM365PlaybookRegistry() {
  return new M365PlaybookRegistry()
    .register(new InactiveUserReclaimPlaybook())
    .register(new LicensePoolRecoveryPlaybook())
    .register(new CopilotRightsizingPlaybook())
    .register(new SharedMailboxConversionPlaybook())
    .register(new DuplicateLicensePlaybook())
    .register(new DormantGroupPlaybook())
    .register(new SecuritySkuRationalizationPlaybook())
}
