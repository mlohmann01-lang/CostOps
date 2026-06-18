export type DataState = 'LIVE' | 'SIMULATION' | 'DEMO' | 'NOT_CONNECTED' | 'NO_DATA'

export interface DataStateInput {
  mode: 'demo' | 'live'
  dataReady: boolean
  hasData: boolean
  simulationOnly?: boolean
}

export function resolveDataState({ mode, dataReady, hasData, simulationOnly }: DataStateInput): DataState {
  if (mode === 'demo') return 'DEMO'
  if (!dataReady) return 'NOT_CONNECTED'
  if (simulationOnly) return 'SIMULATION'
  if (!hasData) return 'NO_DATA'
  return 'LIVE'
}

export const DATA_STATE_LABELS: Record<DataState, string> = {
  LIVE: 'Live',
  SIMULATION: 'Simulation Mode',
  DEMO: 'Demo Mode',
  NOT_CONNECTED: 'Connect Tenant',
  NO_DATA: 'No Data',
}

export const DATA_STATE_DESCRIPTIONS: Record<DataState, string> = {
  LIVE: 'Showing live data from connected systems.',
  SIMULATION: 'Connector is configured for simulated execution only. No live mutations are made.',
  DEMO: 'Synthetic sample data. No production systems connected.',
  NOT_CONNECTED: 'No tenant connector is connected yet. Connect a tenant to see real data here.',
  NO_DATA: 'Connected, but no data has been recorded yet for this view.',
}
