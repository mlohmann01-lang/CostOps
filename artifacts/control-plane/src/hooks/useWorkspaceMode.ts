import { useMemo } from 'react'
import { getOperatingModeConfig, type OperatingMode } from '../lib/operatingMode'

function readConfiguredMode(): OperatingMode {
  const raw = String(import.meta.env.VITE_CERTEN_WORKSPACE_MODE ?? import.meta.env.VITE_WORKSPACE_MODE ?? 'DEMO').toUpperCase()
  return raw === 'PILOT' || raw === 'PRODUCTION' ? raw : 'DEMO'
}

export function useWorkspaceMode() {
  return useMemo(() => {
    const mode = readConfiguredMode()
    const config = getOperatingModeConfig(mode)
    return { mode, config, isDemo: mode === 'DEMO', isPilot: mode === 'PILOT', isProduction: mode === 'PRODUCTION' }
  }, [])
}
