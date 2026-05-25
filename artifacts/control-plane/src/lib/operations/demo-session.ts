import { useSyncExternalStore } from 'react'
import type { DemoScenarioId } from '../demo/scenarios'

type ViewMode = 'executive' | 'operational'
interface DemoSessionState {
  scenarioId: DemoScenarioId
  walkthroughStep: number
  dismissedNarrative: boolean
  approvals: string[]
  executions: string[]
  viewMode: ViewMode
  verifiedSavings: number
  driftLevel: 'none'|'elevated'|'detected'
  flexeraConfigured: boolean
}
const KEY = 'certen-demo-session-v1'
const listeners = new Set<() => void>()

const state: DemoSessionState = load()
function load(): DemoSessionState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...defaults(), ...JSON.parse(raw) }
  } catch {}
  return defaults()
}
function defaults(): DemoSessionState { return { scenarioId: 'openai-token-explosion', walkthroughStep: 0, dismissedNarrative: false, approvals: [], executions: [], viewMode: 'operational', verifiedSavings: 0, driftLevel: 'none', flexeraConfigured: false } }

// Stable snapshot — only replaced on mutation so useSyncExternalStore doesn't loop
let cachedSession: DemoSessionState = { ...state, approvals: [...state.approvals], executions: [...state.executions] }

function save() {
  cachedSession = { ...state, approvals: [...state.approvals], executions: [...state.executions] }
  localStorage.setItem(KEY, JSON.stringify(state))
  listeners.forEach(l => l())
}
export function updateDemoSession(patch: Partial<DemoSessionState>) { Object.assign(state, patch); save() }
export function markApproval(id: string) { if (!state.approvals.includes(id)) state.approvals.push(id); save() }
export function markExecution(id: string) { if (!state.executions.includes(id)) state.executions.push(id); save() }
export function getDemoSession() { return cachedSession }
export function useDemoSession() { return useSyncExternalStore((n) => { listeners.add(n); return () => listeners.delete(n) }, getDemoSession, getDemoSession) }
