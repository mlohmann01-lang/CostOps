export type ServiceNowCapability =
  | 'SERVICENOW_CREATE_CHANGE_REQUEST'
  | 'SERVICENOW_READ_CHANGE_STATUS'
  | 'SERVICENOW_ATTACH_EVIDENCE'
  | 'SERVICENOW_CREATE_TASK'
  | 'SERVICENOW_READ_CMDB_OWNER';

export type ServiceNowChangeType = 'STANDARD' | 'NORMAL' | 'EMERGENCY';
export type ServiceNowChangeState = 'NEW' | 'ASSESS' | 'AUTHORIZE' | 'SCHEDULED' | 'IMPLEMENT' | 'REVIEW' | 'CLOSED' | 'CANCELLED';

export type ServiceNowChangeRequest = {
  changeId: string;
  changeNumber: string;
  type: ServiceNowChangeType;
  state: ServiceNowChangeState;
  shortDescription: string;
  description: string;
  tenantId: string;
  executionId: string;
  assignmentGroup?: string;
  requestedBy: string;
  plannedStart?: string;
  plannedEnd?: string;
  evidenceAttached: boolean;
  externalRef: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateChangeRequestInput = {
  tenantId: string;
  executionId: string;
  actorId: string;
  shortDescription: string;
  description: string;
  type: ServiceNowChangeType;
  assignmentGroup?: string;
  plannedStart?: string;
  plannedEnd?: string;
  proofPacket?: Record<string, unknown>;
};

export type ServiceNowConnectorConfig = {
  tenantId: string;
  instanceUrl: string;
  authType: 'BASIC' | 'OAUTH';
  dryRun: boolean;
  capabilities: ServiceNowCapability[];
  readinessState: 'READY' | 'DEGRADED' | 'UNCONFIGURED';
};

export type ServiceNowResult<T> =
  | { ok: true; data: T; requestId: string; dryRun: boolean }
  | { ok: false; error: string; errorCode: string; requestId: string; dryRun: boolean };

const MOCK_CHANGE_COUNTER = { n: 1000 };

export class ServiceNowChangeManagementConnector {
  constructor(private config: ServiceNowConnectorConfig) {}

  async createChangeRequest(input: CreateChangeRequestInput): Promise<ServiceNowResult<ServiceNowChangeRequest>> {
    const requestId = crypto.randomUUID();

    if (!this.config.capabilities.includes('SERVICENOW_CREATE_CHANGE_REQUEST')) {
      return { ok: false, error: 'Capability not enabled', errorCode: 'CAPABILITY_NOT_ENABLED', requestId, dryRun: this.config.dryRun };
    }

    if (this.config.dryRun || process.env.SERVICENOW_MODE === 'MOCK_CONNECTOR') {
      const changeNumber = `CHG${++MOCK_CHANGE_COUNTER.n}`;
      const record: ServiceNowChangeRequest = {
        changeId: `sn-change-${changeNumber}`,
        changeNumber,
        type: input.type,
        state: 'NEW',
        shortDescription: input.shortDescription,
        description: input.description,
        tenantId: input.tenantId,
        executionId: input.executionId,
        assignmentGroup: input.assignmentGroup,
        requestedBy: input.actorId,
        plannedStart: input.plannedStart,
        plannedEnd: input.plannedEnd,
        evidenceAttached: false,
        externalRef: changeNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { ok: true, data: record, requestId, dryRun: this.config.dryRun };
    }

    try {
      const res = await fetch(`${this.config.instanceUrl}/api/now/table/change_request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          short_description: input.shortDescription,
          description: input.description,
          type: input.type.toLowerCase(),
          assignment_group: input.assignmentGroup,
          u_tenant_id: input.tenantId,
          u_execution_id: input.executionId,
        }),
      });

      if (!res.ok) {
        const status = res.status;
        if (status === 401) return { ok: false, error: 'ServiceNow auth failed', errorCode: 'AUTH_FAILED', requestId, dryRun: false };
        if (status === 403) return { ok: false, error: 'ServiceNow insufficient permissions', errorCode: 'SCOPE_MISSING', requestId, dryRun: false };
        return { ok: false, error: `ServiceNow API error ${status}`, errorCode: `HTTP_${status}`, requestId, dryRun: false };
      }

      const body = await res.json() as { result?: { sys_id?: string; number?: string } };
      const result = body.result ?? {};
      const changeNumber = result.number ?? `CHG${++MOCK_CHANGE_COUNTER.n}`;
      const record: ServiceNowChangeRequest = {
        changeId: result.sys_id ?? `sn-${requestId}`,
        changeNumber,
        type: input.type,
        state: 'NEW',
        shortDescription: input.shortDescription,
        description: input.description,
        tenantId: input.tenantId,
        executionId: input.executionId,
        assignmentGroup: input.assignmentGroup,
        requestedBy: input.actorId,
        evidenceAttached: false,
        externalRef: changeNumber,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return { ok: true, data: record, requestId, dryRun: false };
    } catch (err) {
      return { ok: false, error: String(err), errorCode: 'NETWORK_ERROR', requestId, dryRun: false };
    }
  }

  async readChangeStatus(changeId: string): Promise<ServiceNowResult<{ changeId: string; state: ServiceNowChangeState; approvalStatus: string }>> {
    const requestId = crypto.randomUUID();

    if (this.config.dryRun || process.env.SERVICENOW_MODE === 'MOCK_CONNECTOR') {
      return { ok: true, data: { changeId, state: 'ASSESS', approvalStatus: 'AWAITING_APPROVAL' }, requestId, dryRun: this.config.dryRun };
    }

    try {
      const res = await fetch(`${this.config.instanceUrl}/api/now/table/change_request/${changeId}?sysparm_fields=sys_id,number,state,approval`, {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return { ok: false, error: `ServiceNow error ${res.status}`, errorCode: `HTTP_${res.status}`, requestId, dryRun: false };
      const body = await res.json() as { result?: { state?: string; approval?: string } };
      const r = body.result ?? {};
      return { ok: true, data: { changeId, state: (r.state ?? 'NEW') as ServiceNowChangeState, approvalStatus: r.approval ?? 'NOT_REQUESTED' }, requestId, dryRun: false };
    } catch (err) {
      return { ok: false, error: String(err), errorCode: 'NETWORK_ERROR', requestId, dryRun: false };
    }
  }

  async attachEvidence(changeId: string, proofPacket: Record<string, unknown>): Promise<ServiceNowResult<{ attached: boolean }>> {
    const requestId = crypto.randomUUID();
    if (this.config.dryRun || process.env.SERVICENOW_MODE === 'MOCK_CONNECTOR') {
      return { ok: true, data: { attached: true }, requestId, dryRun: this.config.dryRun };
    }
    try {
      const res = await fetch(`${this.config.instanceUrl}/api/now/attachment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_name: 'change_request', table_sys_id: changeId, file_name: 'proof_packet.json', payload: JSON.stringify(proofPacket) }),
      });
      if (!res.ok) return { ok: false, error: `Attach failed ${res.status}`, errorCode: `HTTP_${res.status}`, requestId, dryRun: false };
      return { ok: true, data: { attached: true }, requestId, dryRun: false };
    } catch (err) {
      return { ok: false, error: String(err), errorCode: 'NETWORK_ERROR', requestId, dryRun: false };
    }
  }

  getReadinessState(): { ready: boolean; state: string; missingCapabilities: string[] } {
    if (this.config.readinessState === 'UNCONFIGURED') {
      return { ready: false, state: 'UNCONFIGURED', missingCapabilities: ['SERVICENOW_CREATE_CHANGE_REQUEST'] };
    }
    return { ready: this.config.readinessState === 'READY', state: this.config.readinessState, missingCapabilities: [] };
  }
}

export function createServiceNowConnector(tenantId: string): ServiceNowChangeManagementConnector {
  const mode = process.env.SERVICENOW_MODE ?? 'MOCK_CONNECTOR';
  return new ServiceNowChangeManagementConnector({
    tenantId,
    instanceUrl: process.env.SERVICENOW_INSTANCE_URL ?? 'https://mock.servicenow.example.com',
    authType: 'OAUTH',
    dryRun: mode === 'MOCK_CONNECTOR' || mode === 'DRY_RUN',
    capabilities: ['SERVICENOW_CREATE_CHANGE_REQUEST', 'SERVICENOW_READ_CHANGE_STATUS', 'SERVICENOW_ATTACH_EVIDENCE', 'SERVICENOW_CREATE_TASK', 'SERVICENOW_READ_CMDB_OWNER'],
    readinessState: mode === 'MOCK_CONNECTOR' ? 'READY' : (process.env.SERVICENOW_INSTANCE_URL ? 'READY' : 'UNCONFIGURED'),
  });
}
