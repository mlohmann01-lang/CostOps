// Program 11 — typed client for the public, pre-login Exposure Review API
// surface (artifacts/api-server/src/routes/exposure-review.ts). Follows the
// same thin fetch-wrapper convention as execution-orchestration-client.ts.

const base = '/api/exposure-review'

const json = async <T>(res: Response): Promise<T> => {
  const data = await res.json()
  if (!res.ok) throw new Error((data as { error?: string })?.error ?? `Request failed (${res.status})`)
  return data as T
}

export type ExposureReviewConfigured = { configured: boolean }

export type ExposureReviewConnectStartResult =
  | { configured: false; reason: string }
  | { configured: true; error: string; scopeCheck: unknown }
  | { configured: true; authorizationUrl: string; state: string; expiresAt: string; scopes: string[] }

export type ExposureReviewConnection = {
  id: string
  tenantId: string
  microsoftTenantId?: string
  status: 'NOT_CONNECTED' | 'CONNECTING' | 'CONNECTED' | 'DISCOVERY_READY' | 'ERROR'
  grantedScopes: string[]
  connectedAt?: string
  failureReason?: string
}

export type ExposureReviewDiscoveryStepKey = 'IDENTITIES' | 'LICENCES' | 'APPLICATIONS' | 'OWNERS' | 'GOVERNANCE_SIGNALS' | 'VALUE_OPPORTUNITIES'

export type ExposureReviewDiscoveryRun = {
  id: string
  tenantId: string
  snapshotId?: string
  status: 'NOT_STARTED' | 'RUNNING' | 'COMPLETED' | 'PARTIAL' | 'FAILED'
  steps: { key: ExposureReviewDiscoveryStepKey; label: string; status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' }[]
  startedAt?: string
  lastUpdatedAt: string
  errors: string[]
}

export type ExposureFinding = {
  id: string
  type: string
  title: string
  description: string
  impact: string
  recommendedAction: string
  potentialAnnualValue: number | null
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  evidenceRefs: string[]
}

export type ExposureReviewReport =
  | { available: false; reason: string }
  | {
      tenantId: string
      mode: 'LIVE'
      generatedAt: string
      generatedStatement: string
      noActionStatement: string
      summary: {
        potentialAnnualValue: number | null
        inactiveLicences: number
        ownerlessLicences: number
        copilotExposure: number
        governanceFindings: number
        exposureScore: number | null
      }
      findings: ExposureFinding[]
    }

export const getExposureReviewConfigured = () => fetch(`${base}/m365/configured`).then(json<ExposureReviewConfigured>)

export const startExposureReviewConnect = (tenantId: string) =>
  fetch(`${base}/m365/connect/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  }).then(json<ExposureReviewConnectStartResult>)

export const getExposureReviewConnectStatus = (tenantId: string) =>
  fetch(`${base}/m365/connect/status?tenantId=${encodeURIComponent(tenantId)}`).then(json<{ connection: ExposureReviewConnection | null }>)

export const runExposureReviewDiscovery = (tenantId: string) =>
  fetch(`${base}/m365/discovery/run?tenantId=${encodeURIComponent(tenantId)}`, { method: 'POST' }).then(
    json<{ run: ExposureReviewDiscoveryRun }>,
  )

export const getExposureReviewDiscoveryStatus = (tenantId: string) =>
  fetch(`${base}/m365/discovery/status?tenantId=${encodeURIComponent(tenantId)}`).then(json<{ run: ExposureReviewDiscoveryRun | null }>)

export const getExposureReviewReport = (tenantId: string) =>
  fetch(`${base}/m365/report?tenantId=${encodeURIComponent(tenantId)}`).then(json<ExposureReviewReport>)

export type ExposureReviewCallbackResult = { connection: ExposureReviewConnection } | { error: string; reason: string }

export const handleExposureReviewConnectCallback = (tenantId: string, params: { code?: string; state: string; error?: string }) => {
  const search = new URLSearchParams({ tenantId, state: params.state })
  if (params.code) search.set('code', params.code)
  if (params.error) search.set('error', params.error)
  return fetch(`${base}/m365/connect/callback?${search.toString()}`).then(async (res) => {
    const data = await res.json()
    return data as ExposureReviewCallbackResult
  })
}
