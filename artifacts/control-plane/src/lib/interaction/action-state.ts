export type ActionPhase = 'idle' | 'loading' | 'success' | 'error' | 'blocked' | 'rbac_denied' | 'demo_simulated'

export interface ActionState {
  phase: ActionPhase
  message?: string
}

export const idleActionState: ActionState = { phase: 'idle' }
