export type M365AuthConfig = { tenantId?: string; clientId?: string; clientSecret?: string; authorityHost?: string; graphBaseUrl?: string }
export type M365TokenResult = { accessToken?: string; requestId?: string; error?: string }

export function getM365AuthConfig(input: M365AuthConfig = {}): Required<M365AuthConfig> {
  return {
    tenantId: input.tenantId ?? process.env.M365_TENANT_ID ?? '',
    clientId: input.clientId ?? process.env.M365_CLIENT_ID ?? '',
    clientSecret: input.clientSecret ?? process.env.M365_CLIENT_SECRET ?? '',
    authorityHost: input.authorityHost ?? process.env.M365_AUTHORITY_HOST ?? 'https://login.microsoftonline.com',
    graphBaseUrl: input.graphBaseUrl ?? process.env.M365_GRAPH_BASE_URL ?? 'https://graph.microsoft.com/v1.0',
  }
}

export function missingM365Config(config = getM365AuthConfig()) {
  return (['tenantId', 'clientId', 'clientSecret'] as const).filter((key) => !config[key])
}

export async function acquireM365AccessToken(config = getM365AuthConfig(), fetchImpl: typeof fetch = fetch): Promise<M365TokenResult> {
  const missing = missingM365Config(config)
  if (missing.length) return { error: `MISSING_CONFIG:${missing.join(',')}` }
  const body = new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, grant_type: 'client_credentials', scope: 'https://graph.microsoft.com/.default' })
  try {
    const response = await fetchImpl(`${config.authorityHost}/${encodeURIComponent(config.tenantId)}/oauth2/v2.0/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body })
    const requestId = response.headers.get('request-id') ?? response.headers.get('x-ms-request-id') ?? undefined
    if (!response.ok) return { requestId, error: `TOKEN_FAILED:${response.status}` }
    const json = await response.json().catch(() => ({})) as { access_token?: string }
    return json.access_token ? { accessToken: json.access_token, requestId } : { requestId, error: 'TOKEN_FAILED:MISSING_ACCESS_TOKEN' }
  } catch (error) {
    return { error: `TOKEN_FAILED:${error instanceof Error ? error.message : 'NETWORK'}` }
  }
}
