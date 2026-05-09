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
