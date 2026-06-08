import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, scryptSync } from 'node:crypto'
import { m365DiscoveryService, type M365DiscoveryOptions } from './m365-discovery-service'
import { platformEventService } from '../../events/platform-event-service'
import { m365SnapshotRepository, type M365SnapshotBundle } from './m365-snapshot-repository'
import type { M365DiscoveryResult, M365LicenseAssignment, M365SubscribedSku, M365UsageRecord, M365User } from './m365-types'

export type CanonicalEntityType = 'User' | 'License' | 'Sku' | 'Group' | 'Department' | 'UsageSignal' | 'CostCenter' | 'Recommendation' | 'EvidencePack' | 'OutcomeEvent'
export type ResolutionState = 'MATCHED' | 'LIKELY_MATCHED' | 'CONFLICTED' | 'UNRESOLVED'
export type TrustState = 'AUTO_ELIGIBLE' | 'APPROVAL_REQUIRED' | 'INVESTIGATE' | 'BLOCKED'
export type OutcomeEventType = 'DISCOVERED' | 'NORMALIZED' | 'MATCHED' | 'TRUSTED' | 'RECOMMENDATION_CREATED' | 'APPROVAL_REQUESTED' | 'APPROVAL_GRANTED' | 'EXECUTED' | 'VERIFIED' | 'DRIFT_DETECTED'
export type M365ProductionPlaybook = 'LICENSE_RECLAIM' | 'LICENSE_RIGHTSIZE' | 'COPILOT_GOVERNANCE'

export type ConnectorHealthOutput = { status: 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'NOT_CONFIGURED'; lastSync: string | null; records: number; latency: number; errors: string[] }
export type ConnectorCapabilities = {
  auth: ['OAUTH2_AUTHORIZATION_CODE']
  graphSources: ['Users', 'Groups', 'Licenses', 'Subscribed SKUs', 'Sign-in Activity', 'M365 Usage Reports', 'Copilot Usage', 'Manager Hierarchy', 'Department', 'Company']
  pipeline: ['Graph', 'Raw Store', 'Normalizer', 'Canonical Model']
  gates: ['Identity Resolution', 'Trust Score', 'Evidence Pack', 'Outcome Ledger Entry']
  playbooks: ['License Reclaim', 'License Rightsize', 'Copilot Governance']
}

export type CanonicalUser = { entityType: 'User'; id: string; tenantId: string; upn: string; email?: string; displayName?: string; departmentId?: string; managerId?: string; employeeId?: string; company?: string; groups: string[]; accountEnabled: boolean; source: { system: 'MICROSOFT_GRAPH'; snapshotId: string; rawIds: string[] } }
export type CanonicalLicense = { entityType: 'License'; id: string; tenantId: string; userId: string; skuId: string; skuPartNumber?: string; assignmentType: string; source: { system: 'MICROSOFT_GRAPH'; snapshotId: string; rawIds: string[] } }
export type CanonicalSku = { entityType: 'Sku'; id: string; tenantId: string; skuId: string; skuPartNumber: string; prepaidEnabled: number; consumedUnits: number; monthlyCost: number }
export type CanonicalGroup = { entityType: 'Group'; id: string; tenantId: string; displayName?: string; source: { system: 'MICROSOFT_GRAPH'; snapshotId: string; rawIds: string[] } }
export type CanonicalDepartment = { entityType: 'Department'; id: string; tenantId: string; name: string; userIds: string[] }
export type CanonicalUsageSignal = { entityType: 'UsageSignal'; id: string; tenantId: string; userId: string; kind: 'SIGN_IN' | 'M365_USAGE' | 'COPILOT_USAGE'; lastActivityDate?: string; active: boolean; rawFields: Record<string, unknown>; source: { system: 'MICROSOFT_GRAPH'; snapshotId: string; rawIds: string[] } }
export type CanonicalCostCenter = { entityType: 'CostCenter'; id: string; tenantId: string; name: string; departmentId?: string }
export type IdentityResolution = { entityType: 'IdentityResolution'; userId: string; identityConfidence: number; ownershipConfidence: number; departmentConfidence: number; state: ResolutionState; drivers: string[]; blockers: string[] }
export type EntityTrustScore = { entityId: string; entityType: CanonicalEntityType; score: number; state: TrustState; dimensions: Record<'Completeness' | 'Consistency' | 'Freshness' | 'Identity' | 'Ownership' | 'Source Reliability' | 'Financial Linkage', number>; confidenceDrivers: string[]; blockingConditions: string[] }
export type RecommendationTrustScore = { score: number; state: TrustState; dimensions: Record<'Entity Trust' | 'Usage Confidence' | 'Entitlement Confidence' | 'Savings Confidence' | 'Policy Fit', number>; confidenceDrivers: string[]; blockingConditions: string[] }
export type ExecutionReadinessScore = { score: number; state: TrustState; dimensions: Record<'Recommendation Trust' | 'Approval State' | 'Risk' | 'Blast Radius' | 'Reversibility', number>; confidenceDrivers: string[]; blockingConditions: string[] }
export type CanonicalRecommendation = { entityType: 'Recommendation'; recommendationId: string; tenantId: string; type: M365ProductionPlaybook; userId: string; skuIds: string[]; projectedSavings: number; trustScore: number; readiness: TrustState; evidencePackId: string; confidenceDrivers: string[]; blockingConditions: string[]; createdAt: string }
export type EvidencePack = { entityType: 'EvidencePack'; evidencePackId: string; tenantId: string; recommendationId: string; sources: unknown[]; identityResolution: IdentityResolution; trustAnalysis: { entityTrust: EntityTrustScore; recommendationTrust: RecommendationTrustScore; executionReadiness: ExecutionReadinessScore }; recommendationLogic: string[]; savingsLogic: string[]; policyEvaluation: string[]; approvalHistory: unknown[]; auditTrail: OutcomeEvent[] }
export type OutcomeEvent = { entityType: 'OutcomeEvent'; eventId: string; timestamp: string; entityId: string; entityTypeRef: CanonicalEntityType | 'Connector'; eventType: OutcomeEventType; actor: string; evidenceId?: string }
export type CanonicalModel = { users: CanonicalUser[]; licenses: CanonicalLicense[]; skus: CanonicalSku[]; groups: CanonicalGroup[]; departments: CanonicalDepartment[]; usageSignals: CanonicalUsageSignal[]; costCenters: CanonicalCostCenter[] }

export type M365AuthorityRun = { tenantId: string; health: ConnectorHealthOutput; discovery: M365DiscoveryResult; canonical: CanonicalModel; identityResolutions: IdentityResolution[]; entityTrust: EntityTrustScore[]; recommendations: CanonicalRecommendation[]; evidencePacks: EvidencePack[]; ledger: OutcomeEvent[]; ledgerPersisted: boolean; executiveProofPack: ExecutiveProofPack; productionGates: { passed: boolean; blockers: string[] } }
export type ExecutiveProofPack = { tenantId: string; executiveSummary: string; projectedSavings: number; trustDistribution: Record<TrustState, number>; recommendations: CanonicalRecommendation[]; evidenceCoverage: { recommendations: number; evidencePacks: number; coveragePercent: number }; approvalRequirements: Array<{ recommendationId: string; readiness: TrustState; blockers: string[] }>; exportable: true; generatedAt: string }

export type M365SecretConfig = { tenantId: string; clientId: string; clientSecret: string; scopes: string[]; refreshToken?: string; accessTokenExpiresAt?: string }
export type RawGraphSourceRecord = { source: string; rawId: string; capturedAt: string; lineageRef: string; payload: unknown }
const DEFAULT_SCOPES = ['User.Read.All', 'Group.Read.All', 'Directory.Read.All', 'Reports.Read.All', 'Organization.Read.All']

class EncryptedConnectorSecretStore {
  private readonly values = new Map<string, string>()
  private key() { return scryptSync(process.env.CONNECTOR_SECRET_KEY ?? 'local-development-connector-secret-key', 'm365-authority', 32) }
  put(connectorId: string, secrets: M365SecretConfig) {
    const iv = randomBytes(12)
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv)
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(secrets), 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    this.values.set(connectorId, Buffer.concat([iv, tag, ciphertext]).toString('base64'))
    return { secretRef: `secret://${connectorId}`, stored: true }
  }
  get(connectorId: string): M365SecretConfig | null {
    const encoded = this.values.get(connectorId)
    if (!encoded) return null
    const raw = Buffer.from(encoded, 'base64')
    const iv = raw.subarray(0, 12)
    const tag = raw.subarray(12, 28)
    const ciphertext = raw.subarray(28)
    const decipher = createDecipheriv('aes-256-gcm', this.key(), iv)
    decipher.setAuthTag(tag)
    return JSON.parse(Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')) as M365SecretConfig
  }
}

export const m365ConnectorSecretStore = new EncryptedConnectorSecretStore()

class RawGraphSnapshotStore {
  private readonly records = new Map<string, RawGraphSourceRecord[]>()
  put(snapshotId: string, records: RawGraphSourceRecord[]) { this.records.set(snapshotId, records.map((record) => ({ ...record }))); return { snapshotId, records: records.length } }
  get(snapshotId: string) { return [...(this.records.get(snapshotId) ?? [])] }
  clear() { this.records.clear() }
}

export const m365RawGraphSnapshotStore = new RawGraphSnapshotStore()

function hashId(...parts: string[]) { return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 24) }
function clamp(n: number) { return Math.max(0, Math.min(100, Math.round(n))) }
function average(values: number[]) { return clamp(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)) }
function daysSince(date?: string) { if (!date) return 9999; const ms = Date.now() - new Date(date).getTime(); return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 86400000)) : 9999 }
function readiness(score: number, blockers: string[]): TrustState { if (blockers.length) return 'BLOCKED'; if (score >= 85) return 'AUTO_ELIGIBLE'; if (score >= 70) return 'APPROVAL_REQUIRED'; if (score >= 50) return 'INVESTIGATE'; return 'BLOCKED' }
function skuMonthlyCost(sku: CanonicalSku) { if (/COPILOT/i.test(sku.skuPartNumber)) return 30; if (/E5/i.test(sku.skuPartNumber)) return 57; if (/E3/i.test(sku.skuPartNumber)) return 36; if (/F3|FRONTLINE/i.test(sku.skuPartNumber)) return 8; return sku.monthlyCost || 20 }

export class M365ProductionAuthorityConnector {
  private lastSync: string | null = null
  private lastLatency = 0
  private errors: string[] = []
  constructor(private readonly tenantId: string, private readonly repository = m365SnapshotRepository) {}

  async connect(input: { authorizationCode?: string; redirectUri?: string; tenantId: string; clientId: string; clientSecret: string; scopes?: string[]; fetchImpl?: typeof fetch }) {
    const scopes = input.scopes?.length ? input.scopes : DEFAULT_SCOPES
    if (input.authorizationCode && !input.redirectUri) throw new Error('M365_REDIRECT_URI_REQUIRED_FOR_AUTHORIZATION_CODE')
    const token = input.authorizationCode ? await exchangeAuthorizationCodeForToken({ tenantId: input.tenantId, clientId: input.clientId, clientSecret: input.clientSecret, authorizationCode: input.authorizationCode, redirectUri: input.redirectUri!, scopes, fetchImpl: input.fetchImpl }) : null
    if (token && !token.ok) throw new Error(token.error ?? 'M365_AUTHORIZATION_CODE_EXCHANGE_FAILED')
    const accessTokenExpiresAt = token?.expiresIn ? new Date(Date.now() + token.expiresIn * 1000).toISOString() : undefined
    m365ConnectorSecretStore.put(`m365:${input.tenantId}`, { tenantId: input.tenantId, clientId: input.clientId, clientSecret: input.clientSecret, scopes, refreshToken: token?.refreshToken, accessTokenExpiresAt })
    return { status: token ? 'CONNECTED' as const : 'CONFIGURED' as const, tenantId: input.tenantId, clientId: input.clientId, scopes, authorizationCodeAccepted: Boolean(input.authorizationCode), tokenValidated: Boolean(token?.accessToken), secretRef: `secret://m365:${input.tenantId}`, requestId: token?.requestId }
  }

  async health(): Promise<ConnectorHealthOutput> {
    const start = Date.now()
    const latest = this.repository.getLatest(this.tenantId)
    const configured = Boolean(m365ConnectorSecretStore.get(`m365:${this.tenantId}`) ?? (process.env.M365_TENANT_ID && process.env.M365_CLIENT_ID && process.env.M365_CLIENT_SECRET))
    const records = latest ? latest.users.length + latest.licenseAssignments.length + latest.skus.length + latest.usageRecords.length + latest.groups.length : 0
    const status = !configured ? 'NOT_CONFIGURED' : this.errors.length ? 'DEGRADED' : latest ? 'HEALTHY' : 'DEGRADED'
    return { status, lastSync: this.lastSync, records, latency: Date.now() - start + this.lastLatency, errors: [...this.errors] }
  }

  capabilities(): ConnectorCapabilities {
    return { auth: ['OAUTH2_AUTHORIZATION_CODE'], graphSources: ['Users', 'Groups', 'Licenses', 'Subscribed SKUs', 'Sign-in Activity', 'M365 Usage Reports', 'Copilot Usage', 'Manager Hierarchy', 'Department', 'Company'], pipeline: ['Graph', 'Raw Store', 'Normalizer', 'Canonical Model'], gates: ['Identity Resolution', 'Trust Score', 'Evidence Pack', 'Outcome Ledger Entry'], playbooks: ['License Reclaim', 'License Rightsize', 'Copilot Governance'] }
  }

  async discover(options: Omit<M365DiscoveryOptions, 'tenantId'> = {}) { return m365DiscoveryService.discover({ tenantId: this.tenantId, ...options }) }
  async sync(options: Omit<M365DiscoveryOptions, 'tenantId'> = {}) {
    const start = Date.now()
    const discovery = await this.discover(options)
    this.lastSync = discovery.completedAt
    this.lastLatency = Date.now() - start
    this.errors = discovery.blockers
    return discovery
  }
  async validate() {
    const latest = this.repository.getLatest(this.tenantId)
    const blockers = latest ? [] : ['No raw Microsoft Graph snapshot is available. Run discover() or sync() first.']
    return { tenantId: this.tenantId, valid: blockers.length === 0, blockers, capabilities: this.capabilities() }
  }

  normalize(bundle = this.repository.getLatest(this.tenantId)): CanonicalModel {
    if (!bundle) return { users: [], licenses: [], skus: [], groups: [], departments: [], usageSignals: [], costCenters: [] }
    const users = bundle.users.map((u) => normalizeUser(bundle, u))
    const licenses = bundle.licenseAssignments.map((l) => normalizeLicense(bundle, l))
    const skus = bundle.skus.map((s) => normalizeSku(bundle, s))
    const groups = bundle.groups.map((g) => ({ entityType: 'Group' as const, id: g.id, tenantId: bundle.snapshot.tenantId, displayName: g.displayName, source: { system: 'MICROSOFT_GRAPH' as const, snapshotId: bundle.snapshot.snapshotId, rawIds: [g.id] } }))
    const departments = [...new Set(users.map((u) => u.departmentId).filter((d): d is string => Boolean(d)))].map((name) => ({ entityType: 'Department' as const, id: hashId(bundle.snapshot.tenantId, 'department', name), tenantId: bundle.snapshot.tenantId, name, userIds: users.filter((u) => u.departmentId === name).map((u) => u.id) }))
    const costCenters = departments.map((d) => ({ entityType: 'CostCenter' as const, id: hashId(bundle.snapshot.tenantId, 'cost-center', d.name), tenantId: bundle.snapshot.tenantId, name: d.name, departmentId: d.id }))
    const usageSignals = normalizeUsageSignals(bundle)
    return { users, licenses, skus, groups, departments, usageSignals, costCenters }
  }

  resolveIdentities(model: CanonicalModel): IdentityResolution[] {
    return model.users.map((user) => {
      const drivers: string[] = []
      const blockers: string[] = []
      let identity = 0
      if (user.upn) { identity += 35; drivers.push('UPN present') } else blockers.push('Missing UPN')
      if (user.email ?? user.upn.includes('@')) { identity += 25; drivers.push('Email/UPN routable') }
      if (user.id) { identity += 20; drivers.push('Graph object ID present') }
      if (user.groups.length) { identity += 10; drivers.push('Group membership observed') }
      if (user.employeeId) { identity += 10; drivers.push('Employee ID present') }
      const ownership = clamp((user.managerId ? 50 : 0) + (user.departmentId ? 25 : 0) + (user.groups.length ? 25 : 0))
      const department = clamp((user.departmentId ? 70 : 0) + (user.company ? 15 : 0) + (user.managerId ? 15 : 0))
      const score = average([identity, ownership || 30, department || 30])
      const strongIdentity = identity >= 75 && department >= 65
      const state: ResolutionState = blockers.length ? 'UNRESOLVED' : score >= 85 ? 'MATCHED' : score >= 65 || strongIdentity ? 'LIKELY_MATCHED' : score >= 45 ? 'CONFLICTED' : 'UNRESOLVED'
      if (state === 'CONFLICTED') blockers.push('Identity signals are incomplete or conflicting')
      if (state === 'UNRESOLVED' && !blockers.length) blockers.push('Identity could not reach minimum confidence')
      return { entityType: 'IdentityResolution' as const, userId: user.id, identityConfidence: clamp(identity), ownershipConfidence: ownership, departmentConfidence: department, state, drivers, blockers }
    })
  }

  scoreEntityTrust(model: CanonicalModel, resolutions: IdentityResolution[]): EntityTrustScore[] {
    return model.users.map((user) => {
      const resolution = resolutions.find((r) => r.userId === user.id)
      const hasUsage = model.usageSignals.some((s) => s.userId === user.id)
      const hasLicense = model.licenses.some((l) => l.userId === user.id)
      const dimensions: EntityTrustScore['dimensions'] = {
        Completeness: clamp((user.upn ? 25 : 0) + (user.id ? 25 : 0) + (hasLicense ? 25 : 0) + (hasUsage ? 25 : 0)),
        Consistency: user.upn.includes('@') ? 90 : 45,
        Freshness: hasUsage ? 85 : 45,
        Identity: resolution?.identityConfidence ?? 0,
        Ownership: resolution?.ownershipConfidence ?? 0,
        'Source Reliability': 95,
        'Financial Linkage': hasLicense ? 80 : 20,
      }
      const blockingConditions = [...(resolution?.blockers ?? [])]
      if (resolution?.state === 'UNRESOLVED' || resolution?.state === 'CONFLICTED') blockingConditions.push(`Identity resolution ${resolution.state}`)
      if (!hasLicense) blockingConditions.push('No license entitlement linked')
      const score = average(Object.values(dimensions))
      return { entityId: user.id, entityType: 'User', score, state: readiness(score, blockingConditions), dimensions, confidenceDrivers: [...(resolution?.drivers ?? []), hasUsage ? 'Usage lineage attached' : 'Usage lineage missing', hasLicense ? 'Financial linkage via license' : 'Financial linkage missing'], blockingConditions }
    })
  }

  generateRecommendations(model: CanonicalModel, resolutions: IdentityResolution[], entityTrust: EntityTrustScore[]): { recommendations: CanonicalRecommendation[]; evidencePacks: EvidencePack[]; ledger: OutcomeEvent[] } {
    const ledger: OutcomeEvent[] = []
    const evidencePacks: EvidencePack[] = []
    const recommendations: CanonicalRecommendation[] = []
    for (const user of model.users) {
      const trust = entityTrust.find((t) => t.entityId === user.id)
      const resolution = resolutions.find((r) => r.userId === user.id)
      if (!trust || !resolution || trust.state === 'BLOCKED') continue
      const userLicenses = model.licenses.filter((l) => l.userId === user.id)
      const signIn = model.usageSignals.find((s) => s.userId === user.id && s.kind === 'SIGN_IN')
      const m365Usage = model.usageSignals.filter((s) => s.userId === user.id && s.kind !== 'SIGN_IN')
      const inactive = daysSince(signIn?.lastActivityDate) >= 60
      const noUsage = m365Usage.length === 0 || m365Usage.every((s) => !s.active || daysSince(s.lastActivityDate) >= 60)
      const excluded = /admin|service|shared|noreply|no-reply/i.test(`${user.upn} ${user.displayName ?? ''}`)
      if (inactive && noUsage && !excluded && userLicenses.length) {
        this.createRecommendation({ type: 'LICENSE_RECLAIM', user, licenses: userLicenses, model, identityResolution: resolution, entityTrust: trust, recommendations, evidencePacks, ledger, logic: ['Inactive user', 'No sign-in inside threshold', 'No M365 usage signal inside threshold', 'No exclusion matched'], savingsMultiplier: 1 })
      }
      const hasHighSku = userLicenses.some((l) => /E5/i.test(l.skuPartNumber ?? ''))
      if (!inactive && hasHighSku && noUsage && !excluded) {
        this.createRecommendation({ type: 'LICENSE_RIGHTSIZE', user, licenses: userLicenses.filter((l) => /E5/i.test(l.skuPartNumber ?? '')), model, identityResolution: resolution, entityTrust: trust, recommendations, evidencePacks, ledger, logic: ['Underutilized high SKU', 'Lower SKU suitable by usage signals', 'Role compatibility requires approval'], savingsMultiplier: 0.4 })
      }
      const copilot = userLicenses.filter((l) => /COPILOT/i.test(l.skuPartNumber ?? ''))
      if (copilot.length && (noUsage || resolution.ownershipConfidence < 70 || resolution.departmentConfidence < 70)) {
        this.createRecommendation({ type: 'COPILOT_GOVERNANCE', user, licenses: copilot, model, identityResolution: resolution, entityTrust: trust, recommendations, evidencePacks, ledger, logic: ['Copilot assigned', 'Low usage or missing owner/justification', 'Policy mismatch requires governance review'], savingsMultiplier: 1 })
      }
    }
    return { recommendations, evidencePacks, ledger }
  }

  async runEndToEnd(options: Omit<M365DiscoveryOptions, 'tenantId'> & { actor?: string; skipDiscovery?: boolean } = {}): Promise<M365AuthorityRun> {
    const discovery = options.skipDiscovery && this.repository.getLatest(this.tenantId) ? this.repository.getLatest(this.tenantId)!.discoveryRun : await this.sync(options)
    const bundle = this.repository.getLatest(this.tenantId)
    if (bundle) this.writeRawStore(bundle)
    const canonical = this.normalize(bundle)
    const ledger = canonical.users.map((user) => event(user.id, 'User', 'NORMALIZED', options.actor ?? 'system'))
    ledger.unshift(event('m365', 'Connector', 'DISCOVERED', options.actor ?? 'system'))
    const identityResolutions = this.resolveIdentities(canonical)
    ledger.push(...identityResolutions.map((r) => event(r.userId, 'User', 'MATCHED', options.actor ?? 'system')))
    const entityTrust = this.scoreEntityTrust(canonical, identityResolutions)
    ledger.push(...entityTrust.map((t) => event(t.entityId, t.entityType, 'TRUSTED', options.actor ?? 'system')))
    const generated = this.generateRecommendations(canonical, identityResolutions, entityTrust)
    const allLedger = [...ledger, ...generated.ledger]
    const ledgerPersisted = await this.persistOutcomeLedger(allLedger)
    const gates = validateProductionGates(generated.recommendations, generated.evidencePacks, allLedger)
    const executiveProofPack = buildExecutiveProofPack(this.tenantId, generated.recommendations, generated.evidencePacks)
    return { tenantId: this.tenantId, health: await this.health(), discovery, canonical, identityResolutions, entityTrust, recommendations: generated.recommendations, evidencePacks: generated.evidencePacks, ledger: allLedger, ledgerPersisted, executiveProofPack, productionGates: gates }
  }

  private writeRawStore(bundle: M365SnapshotBundle) {
    const capturedAt = bundle.snapshot.capturedAt
    const records: RawGraphSourceRecord[] = [
      ...bundle.users.map((payload) => ({ source: 'users', rawId: payload.id, capturedAt, lineageRef: `${bundle.snapshot.snapshotId}:users:${payload.id}`, payload })),
      ...bundle.licenseAssignments.map((payload) => ({ source: 'licenseDetails', rawId: payload.id, capturedAt, lineageRef: `${bundle.snapshot.snapshotId}:licenses:${payload.id}`, payload })),
      ...bundle.skus.map((payload) => ({ source: 'subscribedSkus', rawId: payload.skuId, capturedAt, lineageRef: `${bundle.snapshot.snapshotId}:skus:${payload.skuId}`, payload })),
      ...bundle.usageRecords.map((payload) => ({ source: payload.reportType, rawId: payload.id, capturedAt, lineageRef: `${bundle.snapshot.snapshotId}:usage:${payload.id}`, payload })),
      ...bundle.groups.map((payload) => ({ source: 'groups', rawId: payload.id, capturedAt, lineageRef: `${bundle.snapshot.snapshotId}:groups:${payload.id}`, payload })),
    ]
    return m365RawGraphSnapshotStore.put(bundle.snapshot.snapshotId, records)
  }

  private async persistOutcomeLedger(ledger: OutcomeEvent[]) {
    for (const entry of ledger) {
      await platformEventService.recordNormalizedEvent({ tenantId: this.tenantId, category: entry.eventType === 'DRIFT_DETECTED' ? 'DRIFT' : entry.eventType === 'RECOMMENDATION_CREATED' ? 'OPPORTUNITY' : 'SYSTEM', type: `M365_${entry.eventType}`, eventId: entry.eventId, timestamp: entry.timestamp, entityType: entry.entityTypeRef, entityId: entry.entityId, actorId: entry.actor, evidenceRef: entry.evidenceId, sourceSystem: 'm365-production-authority', metadata: entry }).catch(() => undefined)
    }
    return ledger.length > 0
  }

  private createRecommendation(input: { type: M365ProductionPlaybook; user: CanonicalUser; licenses: CanonicalLicense[]; model: CanonicalModel; identityResolution: IdentityResolution; entityTrust: EntityTrustScore; recommendations: CanonicalRecommendation[]; evidencePacks: EvidencePack[]; ledger: OutcomeEvent[]; logic: string[]; savingsMultiplier: number }) {
    const skus = input.licenses.map((l) => input.model.skus.find((s) => s.skuId === l.skuId)).filter((s): s is CanonicalSku => Boolean(s))
    const projectedSavings = Number((skus.reduce((sum, sku) => sum + skuMonthlyCost(sku), 0) * input.savingsMultiplier).toFixed(2))
    const usageConfidence = input.model.usageSignals.some((s) => s.userId === input.user.id) ? 85 : 45
    const entitlementConfidence = input.licenses.length ? 90 : 0
    const savingsConfidence = projectedSavings > 0 ? 80 : 20
    const recommendationDimensions: RecommendationTrustScore['dimensions'] = { 'Entity Trust': input.entityTrust.score, 'Usage Confidence': usageConfidence, 'Entitlement Confidence': entitlementConfidence, 'Savings Confidence': savingsConfidence, 'Policy Fit': input.type === 'LICENSE_RECLAIM' ? 90 : 75 }
    const recommendationBlockers = [...input.entityTrust.blockingConditions]
    if (projectedSavings <= 0) recommendationBlockers.push('Projected savings could not be calculated from SKU lineage')
    const recTrustScore = average(Object.values(recommendationDimensions))
    const recommendationTrust: RecommendationTrustScore = { score: recTrustScore, state: readiness(recTrustScore, recommendationBlockers), dimensions: recommendationDimensions, confidenceDrivers: ['Entity trust calculated before opportunity generation', 'Entitlement and usage signals linked', ...input.logic], blockingConditions: recommendationBlockers }
    const executionDimensions: ExecutionReadinessScore['dimensions'] = { 'Recommendation Trust': recommendationTrust.score, 'Approval State': input.type === 'LICENSE_RECLAIM' && recommendationTrust.score >= 85 ? 90 : 55, Risk: input.type === 'COPILOT_GOVERNANCE' ? 65 : 80, 'Blast Radius': input.licenses.length === 1 ? 90 : 70, Reversibility: 75 }
    const executionBlockers = [...recommendationTrust.blockingConditions]
    const executionScore = average(Object.values(executionDimensions))
    const executionReadiness: ExecutionReadinessScore = { score: executionScore, state: readiness(executionScore, executionBlockers), dimensions: executionDimensions, confidenceDrivers: ['Approval state evaluated', 'Blast radius scoped to one user', 'Reversibility requires license reassignment proof'], blockingConditions: executionBlockers }
    if (recommendationTrust.state === 'BLOCKED' || executionReadiness.state === 'BLOCKED') return
    const recommendationId = hashId(input.user.tenantId, input.type, input.user.id, input.licenses.map((l) => l.skuId).sort().join(','))
    const evidencePackId = `ep-${recommendationId}`
    const recommendation: CanonicalRecommendation = { entityType: 'Recommendation', recommendationId, tenantId: input.user.tenantId, type: input.type, userId: input.user.id, skuIds: input.licenses.map((l) => l.skuId), projectedSavings, trustScore: recommendationTrust.score, readiness: executionReadiness.state, evidencePackId, confidenceDrivers: [...recommendationTrust.confidenceDrivers, ...executionReadiness.confidenceDrivers], blockingConditions: [...recommendationTrust.blockingConditions, ...executionReadiness.blockingConditions], createdAt: new Date().toISOString() }
    const recEvent = event(recommendationId, 'Recommendation', 'RECOMMENDATION_CREATED', 'm365-production-authority', evidencePackId)
    const pack: EvidencePack = { entityType: 'EvidencePack', evidencePackId, tenantId: input.user.tenantId, recommendationId, sources: [{ user: input.user.source }, ...input.licenses.map((l) => ({ license: l.source })), ...input.model.usageSignals.filter((s) => s.userId === input.user.id).map((s) => ({ usage: s.source }))], identityResolution: input.identityResolution, trustAnalysis: { entityTrust: input.entityTrust, recommendationTrust, executionReadiness }, recommendationLogic: input.logic, savingsLogic: [`Projected savings = linked SKU monthly cost × ${input.savingsMultiplier}`, `Projected savings ${projectedSavings}`], policyEvaluation: recommendation.blockingConditions.length ? recommendation.blockingConditions : ['No blocking policy condition detected'], approvalHistory: [], auditTrail: [recEvent] }
    input.recommendations.push(recommendation)
    input.evidencePacks.push(pack)
    input.ledger.push(recEvent)
  }
}

function normalizeUser(bundle: M365SnapshotBundle, u: M365User): CanonicalUser {
  return { entityType: 'User', id: u.id, tenantId: u.tenantId, upn: u.userPrincipalName, email: u.userPrincipalName.includes('@') ? u.userPrincipalName : undefined, displayName: u.displayName, departmentId: u.department, managerId: (u as any).managerId, employeeId: (u as any).employeeId, company: (u as any).companyName, groups: ((u as any).memberOf ?? []) as string[], accountEnabled: u.accountEnabled, source: { system: 'MICROSOFT_GRAPH', snapshotId: bundle.snapshot.snapshotId, rawIds: [u.id] } }
}
function normalizeLicense(bundle: M365SnapshotBundle, l: M365LicenseAssignment): CanonicalLicense { return { entityType: 'License', id: l.id, tenantId: l.tenantId, userId: l.userId, skuId: l.skuId, skuPartNumber: l.skuPartNumber, assignmentType: l.assignmentType, source: { system: 'MICROSOFT_GRAPH', snapshotId: bundle.snapshot.snapshotId, rawIds: [l.id] } } }
function normalizeSku(bundle: M365SnapshotBundle, s: M365SubscribedSku): CanonicalSku { return { entityType: 'Sku', id: s.skuId, tenantId: bundle.snapshot.tenantId, skuId: s.skuId, skuPartNumber: s.skuPartNumber, prepaidEnabled: s.prepaidEnabled, consumedUnits: s.consumedUnits, monthlyCost: skuMonthlyCost({ skuPartNumber: s.skuPartNumber } as CanonicalSku) } }
function normalizeUsageSignals(bundle: M365SnapshotBundle): CanonicalUsageSignal[] {
  const signals: CanonicalUsageSignal[] = []
  const byUpn = new Map(bundle.users.map((u) => [u.userPrincipalName.toLowerCase(), u]))
  for (const u of bundle.users) {
    const last = u.signInActivity?.lastSignInDateTime ?? u.signInActivity?.lastNonInteractiveSignInDateTime
    signals.push({ entityType: 'UsageSignal', id: hashId(bundle.snapshot.snapshotId, u.id, 'sign-in'), tenantId: u.tenantId, userId: u.id, kind: 'SIGN_IN', lastActivityDate: last, active: daysSince(last) < 60, rawFields: u.signInActivity ?? {}, source: { system: 'MICROSOFT_GRAPH', snapshotId: bundle.snapshot.snapshotId, rawIds: [u.id] } })
  }
  for (const record of bundle.usageRecords) {
    const user = byUpn.get(record.userPrincipalName.toLowerCase())
    if (!user) continue
    const isCopilot = /copilot/i.test(JSON.stringify(record.rawFields))
    signals.push({ entityType: 'UsageSignal', id: record.id, tenantId: record.tenantId, userId: user.id, kind: isCopilot ? 'COPILOT_USAGE' : 'M365_USAGE', lastActivityDate: record.lastActivityDate, active: Boolean(record.exchangeActive || record.oneDriveActive || record.sharePointActive || record.teamsActive || record.outlookActive) && daysSince(record.lastActivityDate) < 60, rawFields: record.rawFields, source: { system: 'MICROSOFT_GRAPH', snapshotId: bundle.snapshot.snapshotId, rawIds: [record.id] } })
  }
  return signals
}
function event(entityId: string, entityTypeRef: OutcomeEvent['entityTypeRef'], eventType: OutcomeEventType, actor: string, evidenceId?: string): OutcomeEvent { return { entityType: 'OutcomeEvent', eventId: randomUUID(), timestamp: new Date().toISOString(), entityId, entityTypeRef, eventType, actor, evidenceId } }
export function validateProductionGates(recommendations: CanonicalRecommendation[], evidencePacks: EvidencePack[], ledger: OutcomeEvent[]) {
  const blockers: string[] = []
  for (const recommendation of recommendations) {
    const pack = evidencePacks.find((p) => p.evidencePackId === recommendation.evidencePackId && p.recommendationId === recommendation.recommendationId)
    if (!pack) blockers.push(`${recommendation.recommendationId}: missing evidence pack`)
    if (!pack?.identityResolution) blockers.push(`${recommendation.recommendationId}: missing identity resolution`)
    if (!recommendation.trustScore) blockers.push(`${recommendation.recommendationId}: missing trust score`)
    if (!ledger.some((e) => e.entityId === recommendation.recommendationId && e.eventType === 'RECOMMENDATION_CREATED' && e.evidenceId === recommendation.evidencePackId)) blockers.push(`${recommendation.recommendationId}: missing outcome ledger entry`)
  }
  return { passed: blockers.length === 0, blockers }
}
export function buildExecutiveProofPack(tenantId: string, recommendations: CanonicalRecommendation[], evidencePacks: EvidencePack[]): ExecutiveProofPack {
  const trustDistribution = recommendations.reduce<Record<TrustState, number>>((acc, rec) => ({ ...acc, [rec.readiness]: (acc[rec.readiness] ?? 0) + 1 }), { AUTO_ELIGIBLE: 0, APPROVAL_REQUIRED: 0, INVESTIGATE: 0, BLOCKED: 0 })
  const projectedSavings = Number(recommendations.reduce((sum, rec) => sum + rec.projectedSavings, 0).toFixed(2))
  return { tenantId, executiveSummary: `${recommendations.length} trusted Microsoft 365 recommendations with ${evidencePacks.length} evidence packs and projected monthly savings of ${projectedSavings}.`, projectedSavings, trustDistribution, recommendations, evidenceCoverage: { recommendations: recommendations.length, evidencePacks: evidencePacks.length, coveragePercent: recommendations.length ? Math.round((evidencePacks.length / recommendations.length) * 100) : 100 }, approvalRequirements: recommendations.filter((r) => r.readiness !== 'AUTO_ELIGIBLE').map((r) => ({ recommendationId: r.recommendationId, readiness: r.readiness, blockers: r.blockingConditions })), exportable: true, generatedAt: new Date().toISOString() }
}
export function getM365OnboardingExperience() {
  return ['Connect Microsoft 365', 'Validate Permissions', 'Run Discovery', 'Review Data Trust', 'Generate Opportunities', 'Generate Evidence Packs', 'Executive Review'].map((label, index) => ({ step: index + 1, label }))
}

export async function exchangeAuthorizationCodeForToken(input: { tenantId: string; clientId: string; clientSecret: string; authorizationCode: string; redirectUri: string; scopes: string[]; fetchImpl?: typeof fetch }) {
  const body = new URLSearchParams({ client_id: input.clientId, client_secret: input.clientSecret, grant_type: 'authorization_code', code: input.authorizationCode, redirect_uri: input.redirectUri, scope: input.scopes.join(' ') })
  const response = await (input.fetchImpl ?? fetch)(`https://login.microsoftonline.com/${encodeURIComponent(input.tenantId)}/oauth2/v2.0/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body })
  const requestId = response.headers.get('request-id') ?? response.headers.get('x-ms-request-id') ?? undefined
  if (!response.ok) return { ok: false as const, requestId, error: `AUTH_CODE_TOKEN_FAILED_${response.status}` }
  const json = await response.json().catch(() => ({})) as { access_token?: string; refresh_token?: string; expires_in?: number }
  return { ok: Boolean(json.access_token), requestId, accessToken: json.access_token, refreshToken: json.refresh_token, expiresIn: json.expires_in }
}

export function buildM365ProductionAuthorityConnector(tenantId: string) { return new M365ProductionAuthorityConnector(tenantId) }
