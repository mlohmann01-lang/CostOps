import { useEffect } from 'react'
import { emitOperationEvent } from '../operations/operation-store'
import { updateDemoSession, useDemoSession } from '../operations/demo-session'
import type { RealityEvent } from './reality-events'
import { REALITY_SCENARIO_TIMELINES } from './reality-scenarios'

const listeners = new Set<() => void>()
const feed: RealityEvent[] = []
let timers: number[] = []

function publish(event: RealityEvent) {
  feed.unshift(event)
  if (feed.length > 40) feed.length = 40
  if (event.type === 'VERIFICATION_COMPLETED') updateDemoSession({ verifiedSavings: 1320 })
  if (event.type === 'VERIFICATION_COMPLETED') emitOperationEvent({ type: 'EXECUTION_COMPLETED', entityId: event.id, timestamp: event.timestamp, demo: true, message: event.message })
  if (event.type === 'DRIFT_RISK_ELEVATED') updateDemoSession({ driftLevel: 'elevated' })
  if (event.type === 'DRIFT_DETECTED') updateDemoSession({ driftLevel: 'detected' })
  if (event.type === 'DRIFT_RISK_ELEVATED' || event.type === 'DRIFT_DETECTED') emitOperationEvent({ type: 'INTELLIGENCE_METRICS_CHANGED', entityId: event.id, timestamp: event.timestamp, demo: true, message: event.message })
  listeners.forEach((l) => l())
}

export function getRealityFeed() { return [...feed] }
export function subscribeRealityFeed(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener) }

export function startRealityEngine(scenarioId: keyof typeof REALITY_SCENARIO_TIMELINES) {
  timers.forEach((t) => window.clearTimeout(t)); timers = []
  REALITY_SCENARIO_TIMELINES[scenarioId].forEach((template, idx) => {
    const t = window.setTimeout(() => publish({ ...template, id: `${scenarioId}-${idx}-${Date.now()}`, timestamp: new Date().toISOString(), demo: true }), template.delayMs)
    timers.push(t)
  })
}

export function useRealityEngine() {
  const demo = useDemoSession()
  useEffect(() => { startRealityEngine(demo.scenarioId as keyof typeof REALITY_SCENARIO_TIMELINES) }, [demo.scenarioId])
}
