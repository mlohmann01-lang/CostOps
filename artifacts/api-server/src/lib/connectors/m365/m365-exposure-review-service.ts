// Program 11 — Real M365 Exposure Discovery service.
//
// This module wires the PUBLIC, pre-login Exposure Review journey
// (control-plane /exposure-review/connect, /discovery, /report) to the
// ALREADY EXISTING M365 connector/Graph infrastructure in this package:
//   - MicrosoftOAuthService + EncryptedMicrosoftTokenStore (real AES-256-GCM
//     encrypted token storage, auth-code OAuth flow, state validation)
//   - m365DiscoveryService / m365SnapshotRepository (real paginated Graph
//     discovery + raw snapshot bundle storage)
//   - M365ProductionAuthorityConnector (normalisation into the existing
//     canonical CanonicalUser/CanonicalLicense/CanonicalSku/CanonicalRecommendation
//     model, identity resolution, trust scoring)
//   - checkExposureReviewScopes (new — hard denylist for write/content scopes)
//
// It does NOT re-implement OAuth, Graph paging, retry/backoff, or
// normalisation — it only adds the exposure-review-specific orchestration:
// binding a public "review session" to a Microsoft tenant, persisting a
// minimal raw-snapshot reference + generated findings via the existing
// live-tenant-readiness persistence pattern (createPersistenceStore), and
// shaping responses for the public Exposure Review pages.
//
// READ-ONLY GUARANTEE: nothing in this module ever calls a Graph mutation
// endpoint, ever accepts a write/content scope, or ever triggers execution,
// approval, or licence-reclaim flows. See m365-exposure-scope-guard.ts and
// runtime-safety tests for enforcement.

import { randomUUID } from 'node:crypto'
import { MicrosoftOAuthService } from '../../microsoft-auth/microsoft-oauth-service'
import { createMicrosoftTokenStore } from '../../microsoft-auth/microsoft-token-db-store'
import { M365GraphClient } from './m365-graph-client'
import { checkExposureReviewScopes, defaultExposureReviewScopes } from './m365-exposure-scope-guard'
import { m365DiscoveryService } from './m365-discovery-service'
import { m365SnapshotRepository } from './m365-snapshot-repository'
import { buildM365ProductionAuthorityConnector, type CanonicalModel } from './m365-production-authority'
import { createPersistenceStore } from '../../live-tenant-readiness'

export type ExposureReviewSessionStatus = 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCOVERY_READY' | 'ERROR'
export type ExposureReviewDiscoveryStepKey = 'IDENTITIES' | 'LICENCES' | 'APPLICATIONS' | 'OWNERS' | 'GOVERNANCE_SIGNALS' | 'VALUE_OPPORTUNITIES'
export type ExposureReviewStepState = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export const EXPOSURE_REVIEW_DISCOVERY_STEPS: { key: ExposureReviewDiscoveryStepKey; label: string }[] = [
  { key: 'IDENTITIES', label: 'Identities' },
  { key: 'LICENCES', label: 'Licences' },
  { key: 'APPLICATIONS', label: 'Applications' },
  { key: 'OWNERS', label: 'Owners' },
  { key: 'GOVERNANCE_SIGNALS', label: 'Governance Signals' },
  { key: 'VALUE_OPPORTUNITIES', label: 'Value Opportunities' },
]

export type ExposureFindingType =
  | 'INACTIVE_LICENSE'
  | 'OWNERLESS_LICENSE'
  | 'COPILOT_EXPOSURE'
  | 'UNASSIGNED_LICENSE_CAPACITY'
  | 'DISABLED_USER_WITH_LICENSE'
  | 'DUPLICATE_ASSIGNMENT_SIGNAL'
  | 'GOVERNANCE_GAP'

export type ExposureFinding = {
  id: string
  tenantId: string
  type: ExposureFindingType
  title: string
  description: string
  impact: string
  recommendedAction: string
  potentialAnnualValue: number | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  evidenceRefs: string[]
  source: 'M365_GRAPH_DISCOVERY'
  createdAt: string
}

export type ExposureReviewConnection = {
  id: string
  tenantId: string
  microsoftTenantId?: string
  status: ExposureReviewSessionStatus
  credentialRef?: string
  grantedScopes: string[]
  connectedAt?: string
  failureReason?: string
  createdAt: string
  updatedAt: string
}

export type ExposureReviewDiscoveryRun = {
  id: string
  tenantId: string
  snapshotId?: string
  status: 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED'
  steps: { key: ExposureReviewDiscoveryStepKey; label: string; status: ExposureReviewStepState }[]
  startedAt?: string
  lastUpdatedAt: string
  errors: string[]
}

export type ExposureReviewSnapshotRecord = {
  id: string
  tenantId: string
  connectorId: 'm365'
  provider: 'M365'
  snapshotId: string
  capturedAt: string
  schemaVersion: 1
  source: 'Microsoft Graph'
  classification: 'METADATA_ONLY'
  counts: Record<string, number>
}

const connectionStore = createPersistenceStore<ExposureReviewConnection & { id: string; tenantId: string }>('EXPOSURE_REVIEW_CONNECTIONS')
const discoveryRunStore = createPersistenceStore<ExposureReviewDiscoveryRun & { id: string; tenantId: string }>('EXPOSURE_REVIEW_DISCOVERY_RUNS')
const snapshotStore = createPersistenceStore<ExposureReviewSnapshotRecord & { id: string; tenantId: string }>('EXPOSURE_REVIEW_SNAPSHOTS')
const findingStore = createPersistenceStore<ExposureFinding & { id: string; tenantId: string }>('EXPOSURE_REVIEW_FINDINGS')

const oauthService = new MicrosoftOAuthService({
  clientId: process.env.M365_CLIENT_ID ?? '',
  clientSecret: process.env.M365_CLIENT_SECRET,
  redirectUri: process.env.EXPOSURE_REVIEW_REDIRECT_URI ?? 'http://localhost:3000/exposure-review/connect',
  tokenStore: createMicrosoftTokenStore(),
})

export function isExposureReviewM365Configured(): boolean {
  return Boolean(process.env.M365_CLIENT_ID)
}

export type StartConnectInput = { tenantId: string; scopes?: string[] }
export async function startExposureReviewConnect(input: StartConnectInput) {
  if (!isExposureReviewM365Configured()) {
    return { configured: false as const, reason: 'Microsoft 365 connection is not configured for this environment.' }
  }
  const scopes = input.scopes?.length ? input.scopes : defaultExposureReviewScopes()
  const scopeCheck = checkExposureReviewScopes(scopes)
  if (!scopeCheck.ok) {
    return { configured: true as const, error: 'FORBIDDEN_SCOPE_REQUESTED', scopeCheck }
  }
  const state = randomUUID()
  const { authorizationUrl } = oauthService.generateAuthorizationUrl({ tenantId: input.tenantId, connectorKey: 'M365', scopes, state })
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await connectionStore.upsert({
    id: state,
    tenantId: input.tenantId,
    status: 'CONNECTING',
    grantedScopes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  return { configured: true as const, authorizationUrl, state, expiresAt, scopes }
}

export type HandleCallbackInput = { tenantId: string; code?: string; state: string; error?: string; scopes?: string[] }
export async function handleExposureReviewCallback(input: HandleCallbackInput): Promise<{ connection: ExposureReviewConnection } | { error: string; reason: string }> {
  const pending = await connectionStore.get(input.tenantId, input.state)
  if (input.error) {
    if (pending) await connectionStore.upsert({ ...pending, status: 'ERROR', failureReason: 'Microsoft 365 connection was cancelled.', updatedAt: new Date().toISOString() })
    return { error: 'OAUTH_CANCELLED', reason: 'Microsoft 365 connection was cancelled.' }
  }
  if (!input.code) return { error: 'OAUTH_CANCELLED', reason: 'Microsoft 365 connection was cancelled.' }

  const scopes = input.scopes?.length ? input.scopes : defaultExposureReviewScopes()
  const scopeCheck = checkExposureReviewScopes(scopes)
  if (!scopeCheck.ok) {
    return { error: 'FORBIDDEN_SCOPE_GRANTED', reason: 'Required read-only permission is missing.' }
  }

  try {
    const connection = await oauthService.exchangeAuthorizationCode({
      tenantId: input.tenantId,
      connectorKey: 'M365',
      code: input.code,
      state: input.state,
      scopes,
    })
    const record: ExposureReviewConnection = {
      id: input.state,
      tenantId: input.tenantId,
      microsoftTenantId: connection.microsoftTenantId,
      status: 'CONNECTED',
      credentialRef: connection.credentialRef,
      grantedScopes: connection.grantedScopes,
      connectedAt: connection.connectedAt,
      createdAt: pending?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    await connectionStore.upsert(record)
    return { connection: record }
  } catch (error) {
    const code = (error as { code?: string })?.code
    const reason =
      code === 'MICROSOFT_AUTH_FAILED'
        ? 'Microsoft 365 connection was cancelled.'
        : 'Microsoft 365 connection could not be completed.'
    if (pending) await connectionStore.upsert({ ...pending, status: 'ERROR', failureReason: reason, updatedAt: new Date().toISOString() })
    return { error: code ?? 'OAUTH_FAILED', reason }
  }
}

export async function getExposureReviewConnection(tenantId: string): Promise<ExposureReviewConnection | undefined> {
  const all = await connectionStore.list(tenantId)
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
}

function emptyDiscoverySteps(): ExposureReviewDiscoveryRun['steps'] {
  return EXPOSURE_REVIEW_DISCOVERY_STEPS.map((step) => ({ key: step.key, label: step.label, status: 'QUEUED' as ExposureReviewStepState }))
}

export async function runExposureReviewDiscovery(tenantId: string): Promise<ExposureReviewDiscoveryRun> {
  const connection = await getExposureReviewConnection(tenantId)
  if (!connection || connection.status !== 'CONNECTED') {
    const run: ExposureReviewDiscoveryRun = {
      id: randomUUID(),
      tenantId,
      status: 'FAILED',
      steps: emptyDiscoverySteps(),
      lastUpdatedAt: new Date().toISOString(),
      errors: ['Microsoft 365 connection expired. Reconnect to continue.'],
    }
    await discoveryRunStore.upsert(run)
    return run
  }

  const runId = randomUUID()
  const startedAt = new Date().toISOString()
  let run: ExposureReviewDiscoveryRun = {
    id: runId,
    tenantId,
    status: 'RUNNING',
    steps: emptyDiscoverySteps().map((step, idx) => ({ ...step, status: idx === 0 ? 'RUNNING' : 'QUEUED' })),
    startedAt,
    lastUpdatedAt: startedAt,
    errors: [],
  }
  await discoveryRunStore.upsert(run)

  try {
    // Use the consented connection's own stored credentialRef/token — never the
    // server-wide M365 env configuration — so discovery queries the Microsoft
    // tenant this review session actually connected to, not whatever tenant
    // happens to be configured server-side (or nothing, if none is).
    const client = connection.credentialRef
      ? new M365GraphClient({
          tenantId,
          tokenProvider: async () => {
            try {
              const accessToken = await oauthService.getAccessTokenForTenant({ tenantId, credentialRef: connection.credentialRef! })
              return { accessToken }
            } catch (error) {
              return { error: (error as { code?: string })?.code ?? 'MICROSOFT_AUTH_FAILED' }
            }
          },
        })
      : undefined
    const discovery = await m365DiscoveryService.discover({ tenantId, client })
    const failed = discovery.status === 'FAILED'
    const partial = discovery.status === 'PARTIAL'
    const stepStatus: ExposureReviewStepState = failed ? 'FAILED' : 'COMPLETED'
    run = {
      ...run,
      snapshotId: discovery.snapshotId,
      status: failed ? 'FAILED' : partial ? 'PARTIAL' : 'COMPLETED',
      steps: emptyDiscoverySteps().map((step) => ({ ...step, status: stepStatus })),
      lastUpdatedAt: new Date().toISOString(),
      errors: discovery.blockers,
    }
    await discoveryRunStore.upsert(run)

    if (!failed) {
      const bundle = m365SnapshotRepository.getLatest(tenantId)
      if (bundle) {
        const counts = {
          users: bundle.users.length,
          licenseAssignments: bundle.licenseAssignments.length,
          skus: bundle.skus.length,
          usageRecords: bundle.usageRecords.length,
          groups: bundle.groups.length,
        }
        await snapshotStore.upsert({
          id: bundle.snapshot.snapshotId,
          tenantId,
          connectorId: 'm365',
          provider: 'M365',
          snapshotId: bundle.snapshot.snapshotId,
          capturedAt: bundle.snapshot.capturedAt,
          schemaVersion: 1,
          source: 'Microsoft Graph',
          classification: 'METADATA_ONLY',
          counts,
        })
        const connector = buildM365ProductionAuthorityConnector(tenantId)
        const canonical = connector.normalize(bundle)
        const findings = generateExposureFindings(tenantId, canonical, bundle.snapshot.snapshotId)
        for (const finding of findings) await findingStore.upsert(finding)
      }
    }
  } catch (error) {
    run = {
      ...run,
      status: 'FAILED',
      steps: run.steps.map((step) => (step.status === 'RUNNING' || step.status === 'QUEUED' ? { ...step, status: 'FAILED' } : step)),
      lastUpdatedAt: new Date().toISOString(),
      errors: [...run.errors, error instanceof Error ? error.message : 'DISCOVERY_FAILED'],
    }
    await discoveryRunStore.upsert(run)
  }

  return run
}

export async function getExposureReviewDiscoveryStatus(tenantId: string): Promise<ExposureReviewDiscoveryRun | undefined> {
  const all = await discoveryRunStore.list(tenantId)
  return all.sort((a, b) => b.lastUpdatedAt.localeCompare(a.lastUpdatedAt))[0]
}

function generateExposureFindings(tenantId: string, canonical: CanonicalModel, snapshotId: string): ExposureFinding[] {
  const findings: ExposureFinding[] = []
  const now = new Date().toISOString()
  const ownedUserIds = new Set(canonical.users.filter((u) => u.managerId || u.groups.length > 0).map((u) => u.id))

  for (const user of canonical.users) {
    const userLicenses = canonical.licenses.filter((l) => l.userId === user.id)
    if (!userLicenses.length) continue
    const signal = canonical.usageSignals.find((s) => s.userId === user.id && s.kind === 'SIGN_IN')
    const inactive = signal ? !signal.active : false

    if (inactive) {
      findings.push({
        id: `${snapshotId}:inactive:${user.id}`,
        tenantId,
        type: 'INACTIVE_LICENSE',
        title: `Inactive licence assignment: ${user.displayName ?? user.upn}`,
        description: `${user.upn} holds ${userLicenses.length} licence(s) with no recent sign-in activity.`,
        impact: 'Licence spend continues for an account with no observed usage.',
        recommendedAction: 'Review with the user or manager before the next renewal.',
        potentialAnnualValue: null,
        confidence: 'MEDIUM',
        evidenceRefs: [`m365:user:${user.id}`, ...userLicenses.map((l) => `m365:license:${l.id}`)],
        source: 'M365_GRAPH_DISCOVERY',
        createdAt: now,
      })
    }

    if (!user.accountEnabled && userLicenses.length) {
      findings.push({
        id: `${snapshotId}:disabled:${user.id}`,
        tenantId,
        type: 'DISABLED_USER_WITH_LICENSE',
        title: `Disabled account still licensed: ${user.displayName ?? user.upn}`,
        description: `${user.upn} is disabled but retains ${userLicenses.length} licence(s).`,
        impact: 'Licence cost is being paid for an account that can no longer sign in.',
        recommendedAction: 'Recommend reviewing licence assignment for removal.',
        potentialAnnualValue: null,
        confidence: 'HIGH',
        evidenceRefs: [`m365:user:${user.id}`],
        source: 'M365_GRAPH_DISCOVERY',
        createdAt: now,
      })
    }

    if (!ownedUserIds.has(user.id) && userLicenses.length) {
      findings.push({
        id: `${snapshotId}:ownerless:${user.id}`,
        tenantId,
        type: 'OWNERLESS_LICENSE',
        title: `No identifiable owner: ${user.displayName ?? user.upn}`,
        description: `${user.upn} has no manager or group ownership signal in discovered data.`,
        impact: 'Ownership gaps make it difficult to validate whether spend is still required.',
        recommendedAction: 'Assign an accountable owner to this licence.',
        potentialAnnualValue: null,
        confidence: 'LOW',
        evidenceRefs: [`m365:user:${user.id}`],
        source: 'M365_GRAPH_DISCOVERY',
        createdAt: now,
      })
    }

    const copilotLicenses = userLicenses.filter((l) => /COPILOT/i.test(l.skuPartNumber ?? ''))
    if (copilotLicenses.length) {
      findings.push({
        id: `${snapshotId}:copilot:${user.id}`,
        tenantId,
        type: 'COPILOT_EXPOSURE',
        title: `Copilot exposure: ${user.displayName ?? user.upn}`,
        description: `${user.upn} is assigned ${copilotLicenses.length} Copilot-related licence(s).${inactive ? ' No recent sign-in activity observed.' : ''}`,
        impact: 'High-cost AI add-on assignment requires usage and ownership justification.',
        recommendedAction: inactive ? 'Review for Copilot reclaim.' : 'Confirm Copilot assignment is justified by usage.',
        potentialAnnualValue: null,
        confidence: inactive ? 'HIGH' : 'MEDIUM',
        evidenceRefs: [`m365:user:${user.id}`, ...copilotLicenses.map((l) => `m365:license:${l.id}`)],
        source: 'M365_GRAPH_DISCOVERY',
        createdAt: now,
      })
    }
  }

  for (const sku of canonical.skus) {
    const assigned = canonical.licenses.filter((l) => l.skuId === sku.skuId).length
    if (sku.prepaidEnabled > assigned) {
      findings.push({
        id: `${snapshotId}:unassigned-capacity:${sku.skuId}`,
        tenantId,
        type: 'UNASSIGNED_LICENSE_CAPACITY',
        title: `Unassigned licence capacity: ${sku.skuPartNumber}`,
        description: `${sku.prepaidEnabled - assigned} of ${sku.prepaidEnabled} purchased ${sku.skuPartNumber} licence(s) are unassigned.`,
        impact: 'Paid-for capacity is not being used.',
        recommendedAction: 'Review whether purchased quantity should be reduced at renewal.',
        potentialAnnualValue: null,
        confidence: 'HIGH',
        evidenceRefs: [`m365:sku:${sku.skuId}`],
        source: 'M365_GRAPH_DISCOVERY',
        createdAt: now,
      })
    }
  }

  return findings
}

export async function getExposureReviewFindings(tenantId: string): Promise<ExposureFinding[]> {
  return findingStore.list(tenantId)
}

export async function getExposureReviewSnapshot(tenantId: string): Promise<ExposureReviewSnapshotRecord | undefined> {
  const all = await snapshotStore.list(tenantId)
  return all.sort((a, b) => b.capturedAt.localeCompare(a.capturedAt))[0]
}

export type ExposureReviewReportSummary = {
  potentialAnnualValue: number | null
  inactiveLicences: number
  ownerlessLicences: number
  copilotExposure: number
  governanceFindings: number
  exposureScore: number | null
}

export type ExposureReviewReport = {
  tenantId: string
  mode: 'LIVE'
  generatedAt: string
  generatedStatement: 'Generated from read-only Microsoft Graph discovery.'
  noActionStatement: 'No actions were executed. No licences were modified.'
  summary: ExposureReviewReportSummary
  findings: ExposureFinding[]
}

export async function getExposureReviewReport(tenantId: string): Promise<ExposureReviewReport | { available: false; reason: string }> {
  const findings = await getExposureReviewFindings(tenantId)
  if (!findings.length) {
    return { available: false, reason: 'No discovered data is available yet for this tenant.' }
  }
  const byType = (type: ExposureFindingType) => findings.filter((f) => f.type === type).length
  const summary: ExposureReviewReportSummary = {
    potentialAnnualValue: findings.some((f) => f.potentialAnnualValue !== null)
      ? findings.reduce((sum, f) => sum + (f.potentialAnnualValue ?? 0), 0)
      : null,
    inactiveLicences: byType('INACTIVE_LICENSE'),
    ownerlessLicences: byType('OWNERLESS_LICENSE'),
    copilotExposure: byType('COPILOT_EXPOSURE'),
    governanceFindings: byType('GOVERNANCE_GAP') + byType('DUPLICATE_ASSIGNMENT_SIGNAL'),
    exposureScore: null,
  }
  return {
    tenantId,
    mode: 'LIVE',
    generatedAt: new Date().toISOString(),
    generatedStatement: 'Generated from read-only Microsoft Graph discovery.',
    noActionStatement: 'No actions were executed. No licences were modified.',
    summary,
    findings,
  }
}

export function classifyExposureReviewError(error: unknown): string {
  const code = (error as { code?: string })?.code ?? String(error)
  if (/CANCELLED|MICROSOFT_AUTH_FAILED/.test(code)) return 'Microsoft 365 connection was cancelled.'
  if (/MISSING_PERMISSION|FORBIDDEN_SCOPE/.test(code)) return 'Required read-only permission is missing.'
  if (/CONSENT|FORBIDDEN/.test(code)) return 'Admin consent is required to run the Exposure Review.'
  if (/RATE_LIMIT/.test(code)) return 'Microsoft Graph rate limit reached. Discovery will retry.'
  if (/TOKEN_EXPIRED|EXPIRED/.test(code)) return 'Microsoft 365 connection expired. Reconnect to continue.'
  return 'Microsoft 365 Exposure Review could not be completed.'
}

export const __testOnly = { connectionStore, discoveryRunStore, snapshotStore, findingStore }
