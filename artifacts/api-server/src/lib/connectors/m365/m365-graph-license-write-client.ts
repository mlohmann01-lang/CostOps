import { assertLiveM365MutationAllowed, type M365MutationGuardContext } from "../../../domain/m365/mutationGuard";
export type M365LicenseRemovalResult = {
  ok: boolean;
  status: "LIVE_EXECUTION_SUBMITTED" | "LIVE_EXECUTION_FAILED" | "LIVE_EXECUTION_BLOCKED" | "LIVE_EXECUTION_PARTIAL";
  requestId: string | null;
  httpStatus: number;
  errorCode?: string;
  errorMessage?: string;
  evidence: Record<string, unknown>;
};

export class M365GraphLicenseWriteClient {
  constructor(private readonly accessToken: string, private readonly timeoutMs = 20000) {}

  async removeUserLicenses(userId: string, skuIds: string[], guardContext: M365MutationGuardContext): Promise<M365LicenseRemovalResult> {
    if (skuIds.length === 0) return { ok: false, status: "LIVE_EXECUTION_BLOCKED", requestId: null, httpStatus: 400, errorCode: "NO_SKUS", evidence: { userId, skuIds } };
    assertLiveM365MutationAllowed(guardContext);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/assignLicense`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ addLicenses: [], removeLicenses: skuIds }),
        signal: controller.signal,
      });
      const requestId = r.headers.get("request-id") ?? null;
      const body = await r.json().catch(() => ({}));
      if (r.status === 429) return { ok: false, status: "LIVE_EXECUTION_BLOCKED", requestId, httpStatus: r.status, errorCode: "RATE_LIMITED", evidence: { userId, skuIds, body } };
      if (!r.ok) return { ok: false, status: "LIVE_EXECUTION_FAILED", requestId, httpStatus: r.status, errorCode: String((body as { error?: { code?: string } }).error?.code ?? "GRAPH_ERROR"), errorMessage: String((body as { error?: { message?: string } }).error?.message ?? "Graph request failed"), evidence: { userId, skuIds, body } };
      return { ok: true, status: "LIVE_EXECUTION_SUBMITTED", requestId, httpStatus: r.status, evidence: { userId, skuIds, body } };
    } catch (error) {
      return { ok: false, status: "LIVE_EXECUTION_FAILED", requestId: null, httpStatus: 500, errorCode: "FETCH_FAILED", errorMessage: error instanceof Error ? error.message : "FETCH_FAILED", evidence: { userId, skuIds } };
    } finally {
      clearTimeout(timer);
    }
  }
}


export type M365LicenseRollbackResult = M365LicenseRemovalResult & { rollback: true };

export async function reassignUserLicenses(accessToken: string, userId: string, skuIds: string[], guardContext: M365MutationGuardContext, timeoutMs = 20000): Promise<M365LicenseRollbackResult> {
  assertLiveM365MutationAllowed(guardContext);
  if (String(process.env.M365_LIVE_LICENSE_ROLLBACK_ENABLED ?? "false") !== "true") {
    return { ok: false, rollback: true, status: "LIVE_EXECUTION_BLOCKED", requestId: null, httpStatus: 403, errorCode: "ROLLBACK_READY_NOT_LIVE_ENABLED", evidence: { userId, skuIds } };
  }
  const c = new M365GraphLicenseWriteClient(accessToken, timeoutMs);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(userId)}/assignLicense`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ addLicenses: skuIds.map((skuId) => ({ skuId })), removeLicenses: [] }),
      signal: controller.signal,
    });
    const body = await r.json().catch(() => ({}));
    return { ok: r.ok, rollback: true, status: r.ok ? "LIVE_EXECUTION_SUBMITTED" : "LIVE_EXECUTION_FAILED", requestId: r.headers.get("request-id"), httpStatus: r.status, evidence: { userId, skuIds, body } };
  } finally {
    clearTimeout(timer);
  }
}
