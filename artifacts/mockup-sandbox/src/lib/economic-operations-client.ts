import { OPERATIONAL_STATES, type OperationalState } from "@/lib/ops-state";

export type OpsApiError = { message: string; status: number; code: string };
export type ConnectorState = "HEALTHY" | "DEGRADED" | "OFFLINE";

export type CommandCenterItemDto = {
  id: string;
  title: string;
  impact: string;
  action: string;
  state: string;
  tenantId: string;
  provider: string;
  approvalRequired: boolean;
};

export type CommandCenterDto = {
  executions: CommandCenterItemDto[];
  connectors: Array<{ id: string; name: string; state: ConnectorState; tenantId: string }>;
  approvals: Array<{ id: string; title: string; state: string; tenantId: string }>;
  health: Array<{ label: string; value: string; state: string }>;
  tenantPosture: Array<{ tenantId: string; state: string; note: string }>;
};

export type TimelineDto = { id: string; events: Array<{ id: string; label: string; state: string; at: string; detail: string }> };
export type ProofDto = { id: string; title: string; summary: string; details: string };
export type RollbackDto = { id: string; deadline: string; blockers: string[]; notes: string };
export type ReplayDto = { id: string; before: string; after: string; propagation: string; risk: string; rollbackPlan: string };

const isPreview = import.meta.env.MODE !== "production";
const baseUrl = import.meta.env.VITE_ECONOMIC_OPERATIONS_API_BASE ?? "";

export function toOperationalState(raw: string): OperationalState {
  const normalized = raw?.toUpperCase().trim();
  return (OPERATIONAL_STATES as readonly string[]).includes(normalized)
    ? (normalized as OperationalState)
    : "MANUAL_ONLY";
}

async function request<T>(path: string): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`);
  if (!res.ok) {
    throw normalizeError(res.status, await res.text());
  }
  return (await res.json()) as T;
}

function normalizeError(status: number, body: string): OpsApiError {
  return { status, code: `HTTP_${status}`, message: body || "Economic operations request failed" };
}

const fixture: CommandCenterDto = {
  executions: [
    { id: "m365-1", title: "M365 license deprovisioning opportunity", impact: "$118,200 annualized savings", action: "Approve staged execution for 410 inactive seats", state: "APPROVAL_REQUIRED", tenantId: "TENANT-US", provider: "M365", approvalRequired: true },
    { id: "m365-2", title: "Execution batch #8022", impact: "71% propagated", action: "Wait for provider settlement window", state: "VERIFICATION_PENDING", tenantId: "TENANT-US", provider: "M365", approvalRequired: false },
  ],
  connectors: [{ id: "c1", name: "M365 Graph", state: "DEGRADED", tenantId: "TENANT-US" }],
  approvals: [{ id: "a1", title: "Seat deprovision wave 2", state: "APPROVAL_REQUIRED", tenantId: "TENANT-US" }],
  health: [{ label: "Rollback blockers", value: "1 deadline inside 6 hours", state: "ROLLBACK_REQUIRED" }],
  tenantPosture: [{ tenantId: "TENANT-US", state: "MANUAL_ONLY", note: "Read-only tenant mode active" }],
};

export const economicOperationsClient = {
  async getCommandCenter(): Promise<CommandCenterDto> {
    try { return await request<CommandCenterDto>("/economic-operations/command-center"); } catch (error) { if (isPreview) return fixture; throw error; }
  },
  getTimeline: (id: string) => request<TimelineDto>(`/economic-operations/timeline/${id}`),
  getProof: (id: string) => request<ProofDto>(`/economic-operations/proof/${id}`),
  getRollback: (id: string) => request<RollbackDto>(`/economic-operations/rollback/${id}`),
  getReplay: (id: string) => request<ReplayDto>(`/economic-operations/replay/${id}`),
};
