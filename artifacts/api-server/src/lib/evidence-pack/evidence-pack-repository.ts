import type { EvidencePack } from './evidence-pack-types'

export class EvidencePackRepository {
  private readonly packs = new Map<string, EvidencePack>()
  private key(tenantId: string, id: string) { return `${tenantId}:${id}` }
  save(pack: EvidencePack) { this.packs.set(this.key(pack.tenantId, pack.evidencePackId), pack); return pack }
  get(tenantId: string, id: string) { return this.packs.get(this.key(tenantId, id)) ?? null }
  list(tenantId: string) { return [...this.packs.values()].filter((pack) => pack.tenantId === tenantId).sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()) }
  clearForTests() { this.packs.clear() }
}
export const evidencePackRepository = new EvidencePackRepository()
