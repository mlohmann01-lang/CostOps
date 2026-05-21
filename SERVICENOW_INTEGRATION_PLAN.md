# ServiceNow Integration Plan

## Purpose

ServiceNow is the external change management anchor for all high-risk economic
operations. Every approval-gated execution that modifies production licenses must
have a corresponding ServiceNow Change Request (CHG) created and linked.

## Integration Architecture

```
Economic Operations Platform
         │
         │ POST /intent { intentType: "APPROVE" }
         │
         ▼
  approvalGranted = true
         │
         │ Enqueue SERVICENOW_CHANGE_CREATE job
         │
         ▼
  Job Worker:
    connector.createChangeRequest({...})
         │
         ▼
  ServiceNow API (dry-run or live)
    → CHG number assigned
    → Change request in "NEW" state
         │
         ▼
  changeId stored in execution record
         │
         │ Execution proceeds only after CHG approved in ServiceNow
         │
         ▼
  connector.readChangeStatus(changeId)
    → state: "IMPLEMENT" or "APPROVED"
         │
         ▼
  Execution allowed
         │
         ▼
  connector.attachEvidence(changeId, {proofId, executionId})
    → Evidence attached to CHG
         │
         ▼
  Change request closed by operator in ServiceNow
```

## Configuration

```bash
SERVICENOW_INSTANCE_URL=https://<instance>.service-now.com
SERVICENOW_CLIENT_ID=<oauth-client-id>
SERVICENOW_CLIENT_SECRET=<oauth-secret>         # From vault
SERVICENOW_MODE=LIVE                            # or MOCK_CONNECTOR for non-production
```

## Capabilities

The `ServiceNowChangeManagementConnector` supports these capabilities:

| Capability | Description | When Used |
|---|---|---|
| `SERVICENOW_CREATE_CHANGE_REQUEST` | Create a new CHG record | On approval granted |
| `SERVICENOW_READ_CHANGE_STATUS` | Get CHG state and approval status | Before execution |
| `SERVICENOW_ATTACH_EVIDENCE` | Attach proof reference to CHG | After execution |
| `SERVICENOW_CREATE_TASK` | Create task within a CHG | For multi-step executions |
| `SERVICENOW_READ_CMDB_OWNER` | Look up CI owner from CMDB | For blast radius assessment |

## Change Request Types

| Type | Use Case | Approval Required |
|---|---|---|
| `NORMAL` | Standard license modification | Yes, by Change Advisory Board |
| `STANDARD` | Pre-approved, low-risk modifications | Optional (pre-approved) |
| `EMERGENCY` | Urgent rollback scenarios | Expedited approval |

For the M365 disabled-user reclaim use case, use `NORMAL` for initial pilot.
Migrate to `STANDARD` after the change type is pre-approved by the Change Advisory Board.

## Integration Flow for M365 License Reclaim

```
1. Operator requests approval (REQUEST_APPROVAL intent)
2. Approver grants approval (APPROVE intent)
3. System enqueues SERVICENOW_CHANGE_CREATE job:
   - shortDescription: "M365 License Reclaim: <userPrincipalName>"
   - description: Full recommendation context, projected savings, proof references
   - type: NORMAL
   - executionId: included for traceability
4. Job creates CHG in ServiceNow → returns changeNumber (e.g., CHG0001234)
5. changeNumber stored in execution record
6. Execution intent submitted: platform checks CHG state via readChangeStatus
7. If CHG state == "IMPLEMENT": execution proceeds
8. After execution: attachEvidence(changeNumber, {proofId, executionId})
9. Operator closes CHG in ServiceNow after verification
```

## Readiness Gate Integration

The `ServiceNowChangeManagementConnector.getReadinessState()` checks:
- Connector is `READY` (all required capabilities enabled)
- Instance URL is reachable
- OAuth credentials are valid

If ServiceNow is not `READY`:
- Execution is blocked at the readiness gate
- Alert created: `CONNECTOR_HEALTH` → `SERVICENOW_CONNECTOR_NOT_READY`

## Dry-Run / Mock Mode

For environments without a live ServiceNow instance:

```bash
SERVICENOW_MODE=MOCK_CONNECTOR
```

In mock mode:
- `createChangeRequest` returns a synthetic CHG number (e.g., `CHG10010001`)
- `readChangeStatus` returns `state: "ASSESS"` (can be advanced manually in tests)
- `attachEvidence` returns `attached: true`
- All operations are logged but no real API calls are made

This enables full integration testing without a ServiceNow license.

## Tenant Scoping

All change requests include `tenantId` in the request payload and are stored with
tenant context. The connector stores records in memory (keyed by changeId) and links
them to the execution record.

Cross-tenant change request access is prevented by the execution record lookup,
which is tenant-scoped before the ServiceNow query is issued.

## Error Handling

| Error | Retry? | Action |
|---|---|---|
| ServiceNow API 503 | Yes | RETRYABLE_PROVIDER_5XX → retry with backoff |
| OAuth 401 | No | NON_RETRYABLE_AUTH → alert, rotate credentials |
| CHG creation conflict | No | Check for existing CHG via executionId lookup |
| CHG not found | No | Re-create CHG, alert operator |

## Deployment Checklist

- [ ] ServiceNow instance URL documented
- [ ] OAuth application registered in ServiceNow
- [ ] Client credentials stored in vault
- [ ] Test CHG created and approved in sandbox instance
- [ ] `SERVICENOW_MODE=LIVE` tested with dry-run change request
- [ ] Evidence attachment tested against sandbox CHG
- [ ] Capability registry confirmed (all 5 capabilities enabled)
- [ ] Operator alert created when CHG approval is pending execution
