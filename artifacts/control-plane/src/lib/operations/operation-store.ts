import type { OperationEvent } from './operation-events'
import { useSyncExternalStore } from 'react'

type OperationListener = (event: OperationEvent) => void

const listeners = new Set<OperationListener>()
const eventLog: OperationEvent[] = []

interface RuntimeSummary {
  approvedCount: number
  executionCompletedCount: number
  blockedCount: number
  verificationPendingCount: number
  connectorIssuesCount: number
  lastEvent?: OperationEvent
}

const summary: RuntimeSummary = {
  approvedCount: 0,
  executionCompletedCount: 0,
  blockedCount: 0,
  verificationPendingCount: 0,
  connectorIssuesCount: 0,
}

// Stable snapshot reference — only replaced when state mutates.
// useSyncExternalStore uses Object.is to compare, so returning a new
// object on every call causes an infinite re-render loop.
let cachedSnapshot: RuntimeSummary = { ...summary }

export function emitOperationEvent(event: OperationEvent) {
  eventLog.unshift(event)
  if (eventLog.length > 200) eventLog.length = 200
  summary.lastEvent = event
  if (event.type === 'RECOMMENDATION_APPROVED') summary.approvedCount += 1
  if (event.type === 'EXECUTION_COMPLETED') summary.executionCompletedCount += 1
  if (event.type === 'EXECUTION_BLOCKED') summary.blockedCount += 1
  if (event.type === 'VERIFICATION_PENDING') summary.verificationPendingCount += 1
  if (event.type === 'CONNECTOR_DEGRADED' || event.type === 'CONNECTOR_UNAVAILABLE') summary.connectorIssuesCount += 1
  if (event.type === 'CONNECTOR_READY' && summary.connectorIssuesCount > 0) summary.connectorIssuesCount -= 1
  cachedSnapshot = { ...summary }
  for (const listener of listeners) listener(event)
}

export function subscribeOperationEvents(listener: OperationListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getOperationEvents() {
  return [...eventLog]
}

export function getRuntimeSummary(): RuntimeSummary {
  return cachedSnapshot
}

export function useRuntimeSummary() {
  return useSyncExternalStore(
    (notify) => subscribeOperationEvents(() => notify()),
    getRuntimeSummary,
    getRuntimeSummary,
  )
}
