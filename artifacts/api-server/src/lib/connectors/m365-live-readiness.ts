import { getGraphAccessToken } from './m365/m365-graph-client'

export type M365ReadinessState = 'READY' | 'DEGRADED' | 'BLOCKED'

export async function checkM365LiveReadiness(input: { requiredScopes?: string[]; grantedScopes?: string[]; tokenProvider?: typeof getGraphAccessToken } = {}) {
  const requiredScopes = input.requiredScopes ?? ['User.Read.All', 'Directory.Read.All']
  const grantedScopes = input.grantedScopes ?? String(process.env.M365_GRAPH_GRANTED_PERMISSIONS ?? '').split(/\s+/).filter(Boolean)
  const missingScopes = requiredScopes.filter((scope) => !grantedScopes.includes(scope))
  const token = await (input.tokenProvider ?? getGraphAccessToken)()
  const state: M365ReadinessState = token.accessToken && missingScopes.length === 0 ? 'READY' : token.accessToken ? 'DEGRADED' : 'BLOCKED'
  return {
    connectorId: 'm365',
    name: 'Microsoft 365',
    state,
    status: state,
    graphAuth: Boolean(token.accessToken),
    tokenAcquired: Boolean(token.accessToken),
    tenantReachable: Boolean(token.accessToken),
    requiredScopes,
    missingScopes,
    requestId: token.requestId,
    error: token.error,
  }
}
