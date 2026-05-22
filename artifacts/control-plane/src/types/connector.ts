export type ReadinessState = 'READY' | 'DEGRADED' | 'UNAVAILABLE' | 'OFF'

export type ConnectorDomain = 'ai' | 'cloud-aws' | 'cloud-az' | 'saas' | 'itam' | 'data'

export type Domain = 'all' | 'ai' | 'cloud' | 'saas' | 'itam' | 'data'

export interface EvidenceSource {
  id: string
  name: string
  iconType: 'api' | 'billing' | 'audit' | 'export'
  trustScore: number
  lastSyncAt: string
  status: 'ACTIVE' | 'LAGGING' | 'FAILED'
}

export interface ConnectorConfig {
  id: string
  name: string
  domain: Domain
  description: string
  iconType: ConnectorDomain
  readiness: ReadinessState
  enabled: boolean
  lastSyncAt: string | null
  evidenceSources: EvidenceSource[]
}
