const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

export type GraphReadOnlyError = { code: string; message: string; status?: number };

export class M365GraphReadOnlyClient {
  constructor(private token: string) {}

  private async fetchPaged(url: string) {
    const out: any[] = [];
    let next: string | undefined = url;
    while (next) {
      const r = await fetch(next, { headers: { Authorization: `Bearer ${this.token}` } });
      if (r.status === 429) {
        const retry = Number(r.headers.get("retry-after") ?? "1");
        await new Promise((x) => setTimeout(x, retry * 1000));
        continue;
      }
      if (!r.ok) throw { code: "GRAPH_READ_FAILED", message: `Graph read failed: ${r.status}`, status: r.status } as GraphReadOnlyError;
      const j = await r.json() as any;
      out.push(...(j.value ?? []));
      next = j["@odata.nextLink"];
    }
    return out;
  }

  validateConnection() { return this.fetchPaged(`${GRAPH_BASE}/organization?$top=1`); }
  listUsers() { return this.fetchPaged(`${GRAPH_BASE}/users?$select=id,userPrincipalName,displayName,department,accountEnabled&$top=100`); }
  listSubscribedSkus() { return this.fetchPaged(`${GRAPH_BASE}/subscribedSkus?$top=100`); }
  listAssignedLicenses() { return this.fetchPaged(`${GRAPH_BASE}/users?$select=id,userPrincipalName,assignedLicenses&$top=100`); }
  listUserSignInActivity() { return this.fetchPaged(`${GRAPH_BASE}/users?$select=id,userPrincipalName,signInActivity&$top=100`); }
  listMailboxSignals() { return Promise.resolve([] as any[]); }
  listServiceUsageSignals() { return Promise.resolve([] as any[]); }
}
