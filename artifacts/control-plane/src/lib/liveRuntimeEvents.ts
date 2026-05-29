import { normalizeRuntimeEvents } from './runtimeEventNormalizer'
import type { RuntimeEvent } from '../types/runtimeEvents'
import type { WorkspaceContext } from '../types/workspace'

export async function fetchRuntimeEvents(options: { tenantId?: string; signal?: AbortSignal } = {}): Promise<RuntimeEvent[]> {
  const params = options.tenantId ? `?tenantId=${encodeURIComponent(options.tenantId)}` : ''
  const response = await fetch(`/api/events${params}`, { method: 'GET', signal: options.signal })
  if (!response.ok) throw new Error(`Runtime events unavailable (${response.status})`)
  const body = await response.json().catch(() => [])
  return normalizeRuntimeEvents(body, { tenantId: options.tenantId })
}

export function subscribeRuntimeEvents(options: {
  workspace: WorkspaceContext
  onEvents: (events: RuntimeEvent[]) => void
  onError?: (error: Error) => void
  intervalMs?: number
}) {
  const { workspace, onEvents, onError, intervalMs = 15_000 } = options
  if (workspace.mode === 'demo' || !workspace.dataReady) return () => undefined

  let stopped = false
  let controller: AbortController | undefined
  const poll = async () => {
    controller?.abort()
    controller = new AbortController()
    try {
      const events = await fetchRuntimeEvents({ tenantId: workspace.tenantId, signal: controller.signal })
      if (!stopped) onEvents(events)
    } catch (error) {
      if (!stopped && !(error instanceof DOMException && error.name === 'AbortError')) onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  void poll()
  const timer = setInterval(() => void poll(), intervalMs)
  return () => {
    stopped = true
    controller?.abort()
    clearInterval(timer)
  }
}
