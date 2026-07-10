// Shared runtime state primitive.
// Every page imports from here rather than duplicating runtimeState checks.

import { useWorkspace } from '../lib/workspaceContext'
import type { WorkspaceRuntimeState } from '../lib/workspaceContext'

export type RuntimeMode = WorkspaceRuntimeState

export interface RuntimeState {
  /** Raw runtime state string */
  mode: RuntimeMode
  /** Running against demo (synthetic) data */
  isDemo: boolean
  /** Live environment — no connectors connected yet */
  isLiveUnconnected: boolean
  /** Live — connectors active but no outcomes verified yet */
  isLiveDiscovering: boolean
  /** Live — connectors active, outcomes verified, fully operational */
  isLiveOperational: boolean
  /** True if any live data is available (discovering or operational) */
  hasLiveData: boolean
}

/**
 * useRuntimeState — shared primitive for DEMO / LIVE_UNCONNECTED / LIVE_DISCOVERING / LIVE_OPERATIONAL.
 *
 * Replaces per-page `workspace.runtimeState === 'LIVE_UNCONNECTED'` checks.
 * Pages should use this hook to drive their empty-state and banner rendering.
 *
 * @example
 * const { isDemo, isLiveUnconnected, isLiveOperational } = useRuntimeState()
 */
export function useRuntimeState(): RuntimeState {
  const workspace = useWorkspace()
  const mode = workspace.runtimeState

  return {
    mode,
    isDemo:              mode === 'DEMO',
    isLiveUnconnected:   mode === 'LIVE_UNCONNECTED',
    isLiveDiscovering:   mode === 'LIVE_DISCOVERING',
    isLiveOperational:   mode === 'LIVE_OPERATIONAL',
    hasLiveData:         mode === 'LIVE_DISCOVERING' || mode === 'LIVE_OPERATIONAL',
  }
}
