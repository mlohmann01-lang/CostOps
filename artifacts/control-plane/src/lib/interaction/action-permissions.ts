type Role = 'ADMIN' | 'OPERATOR' | 'AUDITOR' | 'VIEWER'
type TenantMode = 'DEMO' | 'READ_ONLY' | 'PRODUCTION'
type ActionType = 'APPROVE' | 'EXECUTE' | 'SCHEDULE' | 'ADD_CONNECTOR' | 'TEST_ALL' | 'MANAGE_SOURCES' | 'RECONFIGURE' | 'ACKNOWLEDGE_DRIFT' | 'ROLLBACK'

export interface ActionPermissionInput {
  role: Role
  tenantMode: TenantMode
  actionType: ActionType
  itemState?: string
  connectorState?: string
  liveExecutionEnabled?: boolean
}

export interface ActionPermission {
  canRun: boolean
  disabledReason?: string
  severity: 'info' | 'warning' | 'error'
}

export function getActionPermission(input: ActionPermissionInput): ActionPermission {
  if (input.role === 'VIEWER') return { canRun: false, disabledReason: 'Viewer role cannot run mutating actions.', severity: 'warning' }
  if (input.role === 'AUDITOR') return { canRun: false, disabledReason: 'Auditor role is read-only by policy.', severity: 'warning' }
  if (input.tenantMode === 'READ_ONLY') return { canRun: false, disabledReason: 'Tenant is read-only.', severity: 'warning' }

  const liveOnlyActions: ActionType[] = ['EXECUTE', 'ROLLBACK']
  if (input.tenantMode === 'DEMO' && liveOnlyActions.includes(input.actionType)) {
    return { canRun: false, disabledReason: 'Demo mode does not allow live execution.', severity: 'info' }
  }

  if (input.actionType === 'EXECUTE' && input.liveExecutionEnabled === false) {
    return { canRun: false, disabledReason: 'Live execution is disabled for this tenant.', severity: 'error' }
  }

  if (input.connectorState === 'UNSUPPORTED') {
    return { canRun: false, disabledReason: 'Connector is unsupported for this action.', severity: 'warning' }
  }

  return { canRun: true, severity: 'info' }
}
