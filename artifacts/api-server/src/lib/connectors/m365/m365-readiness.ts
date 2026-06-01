import { platformEventService } from '../../events/platform-event-service'
import { acquireM365AccessToken, getM365AuthConfig, missingM365Config, type M365AuthConfig, type M365TokenResult } from './m365-auth'
import type { M365ReadinessReport, PermissionCheck } from './m365-types'

export const M365_REQUIRED_READ_PERMISSIONS = ['User.Read.All', 'Directory.Read.All', 'Organization.Read.All', 'AuditLog.Read.All', 'Reports.Read.All'] as const
export const M365_FUTURE_WRITE_PERMISSIONS = ['Directory.ReadWrite.All', 'User.ReadWrite.All'] as const

export function parseM365GrantedPermissions(raw = process.env.M365_GRAPH_GRANTED_PERMISSIONS ?? '') { return raw.split(/[\s,]+/).map((scope) => scope.trim()).filter(Boolean) }

export async function checkM365Readiness(input: { tenantId?: string; config?: M365AuthConfig; grantedPermissions?: string[]; tokenProvider?: () => Promise<M365TokenResult>; graphProbe?: (token: string) => Promise<boolean> } = {}): Promise<M365ReadinessReport> {
  const config = getM365AuthConfig(input.config ?? { tenantId: input.tenantId })
  const tenantId = input.tenantId ?? config.tenantId ?? 'unknown'
  const checkedAt = new Date().toISOString()
  const missingConfig = missingM365Config(config)
  const granted = input.grantedPermissions ?? parseM365GrantedPermissions()
  const readChecks: PermissionCheck[] = M365_REQUIRED_READ_PERMISSIONS.map((permission) => ({ permission, required: true, granted: granted.includes(permission), category: 'READ', reason: `${permission} is required for read-only Microsoft Graph discovery` }))
  const writeChecks: PermissionCheck[] = M365_FUTURE_WRITE_PERMISSIONS.map((permission) => ({ permission, required: false, granted: granted.includes(permission), category: 'WRITE', reason: `${permission} is only future write-readiness evidence; it is not required for Sprint 1 discovery` }))
  const missingRead = readChecks.filter((check) => !check.granted).map((check) => check.permission)
  const blockers: string[] = []
  const warnings: string[] = []
  if (missingConfig.length) blockers.push(`Missing M365 config: ${missingConfig.join(', ')}`)
  if (missingRead.length) blockers.push(`Missing required read permissions: ${missingRead.join(', ')}`)
  const writeReady = writeChecks.some((check) => check.granted)
  if (!writeReady) warnings.push('Future write readiness is NOT_READY; read-only discovery remains allowed when read permissions are present')
  let token: M365TokenResult = {}
  if (!missingConfig.length) token = await (input.tokenProvider ?? (() => acquireM365AccessToken(config)))()
  if (!token.accessToken && !missingConfig.length) blockers.push(token.error ?? 'Token acquisition failed')
  let graphReachable = false
  if (token.accessToken) {
    graphReachable = input.graphProbe ? await input.graphProbe(token.accessToken).catch(() => false) : true
    if (!graphReachable) blockers.push('Microsoft Graph unreachable')
  }
  const tokenAcquired = Boolean(token.accessToken)
  const readReady = tokenAcquired && graphReachable && missingRead.length === 0
  const authState = missingConfig.length ? 'MISSING_CONFIG' : !tokenAcquired ? 'TOKEN_FAILED' : !graphReachable ? 'GRAPH_UNREACHABLE' : missingRead.length ? 'INSUFFICIENT_PERMISSIONS' : 'READY'
  const report: M365ReadinessReport = { tenantId, authState, readReady, writeReady, requiredReadPermissions: readChecks, requiredWritePermissions: writeChecks, graphReachable, tokenAcquired, blockers, warnings, checkedAt }
  void platformEventService.recordSystemEvent(tenantId, readReady ? 'M365_READINESS_CHECKED' : 'M365_PERMISSION_BLOCKED', { entityType: 'CONNECTOR', entityId: 'm365', title: readReady ? 'M365 readiness checked' : 'M365 permission/configuration blocked', sourceSystem: 'm365-readiness', metadata: { authState, readReady, writeReady, missingRead } }).catch(() => undefined)
  return report
}
