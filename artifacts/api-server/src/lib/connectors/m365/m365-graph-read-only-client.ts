const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export type GraphReadOnlyErrorCode = "RATE_LIMITED" | "UNAUTHORIZED" | "FORBIDDEN" | "TIMEOUT" | "NETWORK" | "GRAPH_READ_FAILED";
export type GraphReadOnlyError = { code: GraphReadOnlyErrorCode; message: string; status?: number };

export type M365TenantGraphConfig = { tenantId: string; timeoutMs?: number };

export class M365GraphReadOnlyClient {
  private readonly timeoutMs: number;

  constructor(private token: string, private readonly cfg: M365TenantGraphConfig = { tenantId: "unknown" }) {
    this.timeoutMs = cfg.timeoutMs ?? 15000;
  }

  private classifyError(status: number): GraphReadOnlyError {
    if (status === 401) return { code: "UNAUTHORIZED", message: "Graph read unauthorized", status };
    if (status === 403) return { code: "FORBIDDEN", message: "Graph read forbidden", status };
    return { code: "GRAPH_READ_FAILED", message: `Graph read failed: ${status}`, status };
  }

  private async fetchPage(url: string): Promise<any> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      return await fetch(url, { headers: { Authorization: `Bearer ${this.token}` }, signal: controller.signal });
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") throw { code: "TIMEOUT", message: `Graph request timeout after ${this.timeoutMs}ms` } as GraphReadOnlyError;
      throw { code: "NETWORK", message: "Graph network failure" } as GraphReadOnlyError;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchPaged(url: string) {
    const out: any[] = [];
    let next: string | undefined = url;
    let retries = 0;
    while (next) {
      const r = await this.fetchPage(next) as Response;
      if (r.status === 429) {
        if (retries >= 3) throw { code: "RATE_LIMITED", message: "Graph rate limit exceeded after retries", status: 429 } as GraphReadOnlyError;
        retries += 1;
        const retry = Number(r.headers.get("retry-after") ?? "1");
        await new Promise((x) => setTimeout(x, retry * 1000));
        continue;
      }
      retries = 0;
      if (!r.ok) throw this.classifyError(r.status);
      const j = await r.json() as any;
      out.push(...(j.value ?? []));
      next = j["@odata.nextLink"];
    }
    return out;
  }

  validateConnection() { return this.fetchPaged(`${GRAPH_BASE}/organization?$top=1`); }
  listUsers() { return this.fetchPaged(`${GRAPH_BASE}/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,createdDateTime,assignedLicenses,department,jobTitle,usageLocation,signInActivity&$top=100`); }
  listSubscribedSkus() { return this.fetchPaged(`${GRAPH_BASE}/subscribedSkus?$select=skuId,skuPartNumber,prepaidUnits,consumedUnits,servicePlans&$top=100`); }
  listGroups() { return this.fetchPaged(`${GRAPH_BASE}/groups?$select=id,displayName&$top=100`); }
  listDirectoryRoles() { return this.fetchPaged(`${GRAPH_BASE}/directoryRoles?$select=id,displayName&$top=100`); }
  getUserSignInActivity() { return this.fetchPaged(`${GRAPH_BASE}/users?$select=id,userPrincipalName,signInActivity&$top=100`); }
  listAssignedLicenses() { return this.fetchPaged(`${GRAPH_BASE}/users?$select=id,userPrincipalName,assignedLicenses&$top=100`); }
  listUserSignInActivity() { return this.getUserSignInActivity(); }
  listMailboxSignals() { return Promise.resolve([] as any[]); }
  listServiceUsageSignals() { return Promise.resolve([] as any[]); }
}
