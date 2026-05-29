export type MonitoredOutcome = {
  outcomeId: string
  tenantId: string
  entityType: string
  entityId: string
  verificationDate: string
  lastCheckDate?: string
  monitoringState: 'MONITORED' | 'DRIFT_DETECTED' | 'RESOLVED'
}

const store = new Map<string, MonitoredOutcome[]>()

export class MonitoredOutcomeService {
  register(input: Omit<MonitoredOutcome, 'monitoringState'> & { monitoringState?: MonitoredOutcome['monitoringState'] }) {
    const row: MonitoredOutcome = { ...input, monitoringState: input.monitoringState ?? 'MONITORED' }
    const rows = (store.get(row.tenantId) ?? []).filter((existing) => existing.outcomeId !== row.outcomeId)
    store.set(row.tenantId, [row, ...rows])
    return row
  }

  list(tenantId: string) {
    return store.get(tenantId) ?? []
  }

  update(tenantId: string, outcomeId: string, patch: Partial<MonitoredOutcome>) {
    const rows = this.list(tenantId)
    const index = rows.findIndex((row) => row.outcomeId === outcomeId)
    if (index < 0) return null
    rows[index] = { ...rows[index], ...patch, lastCheckDate: new Date().toISOString() }
    store.set(tenantId, rows)
    return rows[index]
  }

  clear(tenantId?: string) {
    if (tenantId) store.delete(tenantId)
    else store.clear()
  }
}

export const monitoredOutcomeService = new MonitoredOutcomeService()
