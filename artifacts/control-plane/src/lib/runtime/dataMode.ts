export type RuntimeDataMode = 'DEMO' | 'LIVE' | 'TEST' | 'SIMULATION'
export type DataState = 'DEMO' | 'LIVE' | 'NO_DATA' | 'NOT_CONNECTED' | 'ERROR'

export function normalizeRuntimeDataMode(value?: string | null): RuntimeDataMode {
  const mode = String(value ?? '').trim().toUpperCase()
  if (mode === 'DEMO' || mode === 'LIVE' || mode === 'TEST' || mode === 'SIMULATION') return mode
  if (mode === 'TRUE') return 'DEMO'
  if (mode === 'FALSE' || mode === '') return 'LIVE'
  return 'LIVE'
}

export function isDemoMode(value?: string | null): boolean {
  return normalizeRuntimeDataMode(value) === 'DEMO'
}

export function liveDataState(input: { connected?: boolean; error?: unknown; hasData?: boolean }): Exclude<DataState, 'DEMO'> {
  if (input.error) return 'ERROR'
  if (input.connected === false) return 'NOT_CONNECTED'
  if (!input.hasData) return 'NO_DATA'
  return 'LIVE'
}
