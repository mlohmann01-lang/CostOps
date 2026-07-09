export type WorkspaceMode = 'demo' | 'live'

export type WorkspaceRuntimeState =
  | 'DEMO'
  | 'LIVE_UNCONNECTED'
  | 'LIVE_DISCOVERING'
  | 'LIVE_OPERATIONAL'

export interface WorkspaceContext {
  mode: WorkspaceMode
  tenantId: string
  tenantName: string
  dataReady: boolean
  runtimeState: WorkspaceRuntimeState
  connectedCount: number
}

export const DEMO_CONTEXT: WorkspaceContext = {
  mode: 'demo',
  tenantId: 'demo-sandbox-tenant',
  tenantName: 'Demo workspace',
  dataReady: true,
  runtimeState: 'DEMO',
  connectedCount: 0,
}
