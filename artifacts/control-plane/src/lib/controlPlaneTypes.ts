import type { RuntimeEnvironment } from './runtimeContext'

export type ControlPlaneDataSource = 'DEMO_SEED' | 'LIVE_API' | 'LIVE_EMPTY' | 'LIVE_ERROR'
export type ControlPlaneRecordEnvironment = 'DEMO' | 'LIVE'

export interface ControlPlaneRuntimeMetadata {
  environment: RuntimeEnvironment
  tenantId: string
  dataSource: ControlPlaneDataSource
  generatedAt?: string
  error?: string
}
