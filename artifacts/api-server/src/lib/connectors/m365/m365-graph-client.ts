const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
const TOKEN_URL = (tenantId: string) => `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

type GraphPage<T> = { value?: T[]; "@odata.nextLink"?: string };

type GraphUser = { id: string; userPrincipalName: string; displayName?: string; accountEnabled?: boolean; assignedLicenses?: Array<{ skuId?: string }> };

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url: string, init: RequestInit, maxRetries = 4): Promise<Response> {
  for (let i = 0; i <= maxRetries; i += 1) {
    const response = await fetch(url, init);
    if (response.ok) return response;
    if (![429, 500, 502, 503, 504].includes(response.status) || i === maxRetries) return response;
    const retryAfter = Number(response.headers.get("retry-after") ?? "0");
    const delayMs = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** i;
    await sleep(delayMs);
  }
  throw new Error("unreachable");
}

async function fetchAllPages<T>(url: string, token: string): Promise<{ items: T[]; requestId?: string }> {
  const items: T[] = [];
  let next: string | undefined = url;
  let requestId: string | undefined;
  while (next) {
    const response = await fetchWithRetry(next, { headers: { Authorization: `Bearer ${token}` } });
    requestId = response.headers.get("request-id") ?? response.headers.get("x-ms-request-id") ?? requestId ?? undefined;
    if (!response.ok) throw new Error(`GRAPH_REQUEST_FAILED_${response.status}`);
    const page = (await response.json()) as GraphPage<T>;
    items.push(...(page.value ?? []));
    next = page["@odata.nextLink"];
  }
  return { items, requestId };
}

export async function getGraphAccessToken(): Promise<{ accessToken?: string; requestId?: string; error?: string }> {
  const tenantId = process.env.M365_TENANT_ID;
  const clientId = process.env.M365_CLIENT_ID;
  const clientSecret = process.env.M365_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    return { error: "MISSING_M365_ENV" };
  }

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
    scope: "https://graph.microsoft.com/.default",
  });

  const response = await fetchWithRetry(TOKEN_URL(tenantId), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const requestId = response.headers.get("request-id") ?? response.headers.get("x-ms-request-id") ?? undefined;
  if (!response.ok) {
    return { requestId, error: `TOKEN_REQUEST_FAILED_${response.status}` };
  }
  const json = (await response.json()) as { access_token?: string };
  if (!json.access_token) return { requestId, error: "TOKEN_MISSING_ACCESS_TOKEN" };
  return { accessToken: json.access_token, requestId };
}

export async function fetchGraphUsers(accessToken: string): Promise<{ users: GraphUser[]; requestId?: string }> {
  const url = `${GRAPH_BASE}/users?$select=id,userPrincipalName,displayName,accountEnabled,assignedLicenses&$top=100`;
  const { items, requestId } = await fetchAllPages<GraphUser>(url, accessToken);
  return { users: items, requestId };
}

export async function fetchGraphUserLicences(accessToken: string, users: GraphUser[]): Promise<{ licencesByUpn: Record<string, string[]>; requestId?: string }> {
  const requestIdParts: string[] = [];
  const licencesByUpn: Record<string, string[]> = {};
  for (const user of users) {
    const url = `${GRAPH_BASE}/users/${encodeURIComponent(user.id)}/licenseDetails?$select=skuId`;
    const response = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const rid = response.headers.get("request-id") ?? response.headers.get("x-ms-request-id");
    if (rid) requestIdParts.push(rid);
    if (!response.ok) throw new Error(`GRAPH_LICENCE_REQUEST_FAILED_${response.status}`);
    const json = (await response.json()) as GraphPage<{ skuId?: string }>;
    licencesByUpn[user.userPrincipalName] = (json.value ?? []).map((x) => x.skuId).filter((x): x is string => Boolean(x));
  }
  return { licencesByUpn, requestId: requestIdParts[0] };
}

export async function fetchGraphUserActivity(accessToken: string, users: GraphUser[]): Promise<{ lastLoginDaysByUpn: Record<string, number | null>; requestId?: string }> {
  const requestIdParts: string[] = [];
  const lastLoginDaysByUpn: Record<string, number | null> = {};
  for (const user of users) {
    const url = `${GRAPH_BASE}/users/${encodeURIComponent(user.id)}?$select=signInActivity`;
    const response = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const rid = response.headers.get("request-id") ?? response.headers.get("x-ms-request-id");
    if (rid) requestIdParts.push(rid);
    if (!response.ok) throw new Error(`GRAPH_ACTIVITY_REQUEST_FAILED_${response.status}`);
    const json = (await response.json()) as { signInActivity?: { lastSignInDateTime?: string } };
    const ts = json.signInActivity?.lastSignInDateTime;
    if (!ts) {
      lastLoginDaysByUpn[user.userPrincipalName] = null;
      continue;
    }
    const diffMs = Date.now() - new Date(ts).getTime();
    lastLoginDaysByUpn[user.userPrincipalName] = Number.isNaN(diffMs) ? null : Math.max(0, Math.floor(diffMs / 86400000));
  }
  return { lastLoginDaysByUpn, requestId: requestIdParts[0] };
}


export async function fetchGraphUsersFirstPage(accessToken: string): Promise<{ users: GraphUser[]; requestId?: string }> {
  const url = `${GRAPH_BASE}/users?$select=id,userPrincipalName,displayName,accountEnabled,assignedLicenses&$top=100`;
  const response = await fetchWithRetry(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const requestId = response.headers.get("request-id") ?? response.headers.get("x-ms-request-id") ?? undefined;
  if (!response.ok) throw new Error(`GRAPH_REQUEST_FAILED_${response.status}`);
  const page = (await response.json()) as GraphPage<GraphUser>;
  return { users: page.value ?? [], requestId };
}

export type M365GraphClientOptions = { tenantId: string; accessToken?: string; graphBaseUrl?: string; timeoutMs?: number; fetchImpl?: typeof fetch; tokenProvider?: () => Promise<{ accessToken?: string; requestId?: string; error?: string }>; retryBaseMs?: number }
export type M365GraphStructuredError = { code: 'TOKEN_FAILED' | 'GRAPH_TIMEOUT' | 'GRAPH_UNREACHABLE' | 'GRAPH_FORBIDDEN' | 'GRAPH_UNAUTHORIZED' | 'GRAPH_RATE_LIMITED' | 'GRAPH_ERROR'; message: string; status?: number; requestId?: string; correlationId?: string }

export class M365GraphClient {
  private readonly graphBaseUrl: string
  private readonly timeoutMs: number
  private readonly fetchImpl: typeof fetch
  private readonly retryBaseMs: number
  constructor(private readonly options: M365GraphClientOptions) {
    this.graphBaseUrl = options.graphBaseUrl ?? GRAPH_BASE
    this.timeoutMs = options.timeoutMs ?? 15000
    this.fetchImpl = options.fetchImpl ?? fetch
    this.retryBaseMs = options.retryBaseMs ?? 250
  }

  async authenticate() { return this.getToken() }

  private async getToken() {
    if (this.options.accessToken) return { accessToken: this.options.accessToken }
    const token = await (this.options.tokenProvider ?? getGraphAccessToken)()
    if (!token.accessToken) throw { code: 'TOKEN_FAILED', message: token.error ?? 'Token acquisition failed', requestId: token.requestId } as M365GraphStructuredError
    return token
  }

  private async request(pathOrUrl: string, init: RequestInit = {}, retry = 0): Promise<Response> {
    const token = await this.getToken()
    const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${this.graphBaseUrl}${pathOrUrl}`
    const correlationId = `m365-${Date.now()}-${Math.random().toString(16).slice(2)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const response = await this.fetchImpl(url, { ...init, method: init.method ?? 'GET', headers: { Authorization: `Bearer ${token.accessToken}`, 'client-request-id': correlationId, ...(init.headers ?? {}) }, signal: controller.signal })
      if ((response.status === 429 || response.status === 503) && retry < 3) {
        const retryAfter = Number(response.headers.get('retry-after') ?? '0')
        await sleep(retryAfter > 0 ? retryAfter * 1000 : this.retryBaseMs * 2 ** retry)
        return this.request(pathOrUrl, init, retry + 1)
      }
      if (!response.ok && response.status !== 302) throw this.errorFromResponse(response, correlationId)
      return response
    } catch (error) {
      if ((error as Error).name === 'AbortError') throw { code: 'GRAPH_TIMEOUT', message: `Graph request timeout after ${this.timeoutMs}ms`, correlationId } as M365GraphStructuredError
      if ((error as M365GraphStructuredError).code) throw error
      throw { code: 'GRAPH_UNREACHABLE', message: error instanceof Error ? error.message : 'Graph request failed', correlationId } as M365GraphStructuredError
    } finally { clearTimeout(timer) }
  }

  private errorFromResponse(response: Response, correlationId: string): M365GraphStructuredError {
    const requestId = response.headers.get('request-id') ?? response.headers.get('x-ms-request-id') ?? undefined
    if (response.status === 401) return { code: 'GRAPH_UNAUTHORIZED', message: 'Microsoft Graph unauthorized', status: response.status, requestId, correlationId }
    if (response.status === 403) return { code: 'GRAPH_FORBIDDEN', message: 'Microsoft Graph forbidden', status: response.status, requestId, correlationId }
    if (response.status === 429) return { code: 'GRAPH_RATE_LIMITED', message: 'Microsoft Graph rate limited', status: response.status, requestId, correlationId }
    return { code: 'GRAPH_ERROR', message: `Microsoft Graph request failed with ${response.status}`, status: response.status, requestId, correlationId }
  }

  async getJson<T = any>(pathOrUrl: string) { const response = await this.request(pathOrUrl); return response.json() as Promise<T> }
  async getPaged<T = any>(pathOrUrl: string, maxPages = 20) {
    const items: T[] = []
    let next: string | undefined = pathOrUrl
    let pages = 0
    while (next && pages < maxPages) {
      const page: { value?: T[]; '@odata.nextLink'?: string } = await this.getJson(next)
      items.push(...(page.value ?? []))
      next = page['@odata.nextLink']
      pages += 1
    }
    return items
  }
  getUsersPage(top = 100) { return this.getJson(`/users?$select=id,displayName,userPrincipalName,accountEnabled,userType,department,jobTitle,usageLocation,createdDateTime,assignedLicenses,assignedPlans,signInActivity&$top=${top}`) }
  getUserLicenseDetails(userId: string) { return this.getPaged(`/users/${encodeURIComponent(userId)}/licenseDetails?$select=id,skuId,skuPartNumber,servicePlans`) }
  getSubscribedSkus() { return this.getPaged(`/subscribedSkus?$select=skuId,skuPartNumber,prepaidUnits,consumedUnits,capabilityStatus,appliesTo&$top=100`) }
  getGroupsPage(top = 100) { return this.getJson(`/groups?$select=id,displayName&$top=${top}`) }
  getOrganization() { return this.getPaged(`/organization?$select=id,displayName&$top=1`) }
  async getOffice365ActiveUserDetail(period = 'D30') { return this.getReport(`/reports/getOffice365ActiveUserDetail(period='${period}')`) }
  async getMailboxUsageDetail(period = 'D30') { return this.getReport(`/reports/getMailboxUsageDetail(period='${period}')`) }

  async removeLicense(input: { userId: string; skuId: string; calledBy: 'M365LicenseExecutionService' }) {
    if (input.calledBy !== 'M365LicenseExecutionService') throw new Error('M365_GRAPH_MUTATION_FORBIDDEN_CALLER')
    if (process.env.M365_ENABLE_LIVE_LICENSE_MUTATION !== 'true') throw new Error('MUTATION_DISABLED')
    const response = await this.request(`/users/${encodeURIComponent(input.userId)}/assignLicense`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ addLicenses: [], removeLicenses: [input.skuId] }) })
    const requestId = response.headers.get('request-id') ?? response.headers.get('x-ms-request-id') ?? undefined
    return { status: 'REMOVED' as const, userId: input.userId, skuId: input.skuId, requestId }
  }
  private async getReport(path: string) {
    const response = await this.request(path)
    const location = response.headers.get('location')
    if (response.status === 302 && location) return (await this.fetchImpl(location)).text()
    return response.text()
  }
}
