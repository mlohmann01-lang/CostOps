export type WorkspaceMode = 'demo' | 'live'

export interface WorkspaceContext {
  mode: WorkspaceMode
  tenantId: string
  tenantName: string
  dataReady: boolean
}

export const DEMO_CONTEXT: WorkspaceContext = {
  mode: 'demo',
  tenantId: 'demo-sandbox-tenant',
  tenantName: 'Demo workspace',
  dataReady: true,
}
