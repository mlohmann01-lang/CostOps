import { M365RecommendationService } from '../playbooks/m365/m365-recommendation-service'
import { RecommendationGovernanceEventRepository } from '../recommendations/governance-event-repository'
import { RecommendationGovernanceEventService } from '../recommendations/governance-event-service'
import { discoverM365ReadOnly } from './m365-live-discovery'

export async function generateM365RecommendationsFromLiveReadOnly(input: { tenantId: string; discovery?: typeof discoverM365ReadOnly }) {
  const discovery = await (input.discovery ?? discoverM365ReadOnly)({ tenantId: input.tenantId })
  const service = new M365RecommendationService({
    eventService: new RecommendationGovernanceEventService(new RecommendationGovernanceEventRepository({ storageMode: 'memory' })),
    loadUsers: async () => discovery.users as any[],
  })
  const summary = await service.generateForTenant(input.tenantId, 'm365-live-read-only')
  return { ...summary, readOnly: true, discoveredUsers: discovery.users.length }
}
