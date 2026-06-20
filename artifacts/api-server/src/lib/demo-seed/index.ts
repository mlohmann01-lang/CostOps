import { assertDemoMode, resolveRuntimeDataMode, type RuntimeDataMode } from '../runtime/data-mode'

export const DEMO_SEED_TENANT_ID = 'demo-contoso-retail'
export const DEMO_SEED_LABEL = 'DEMO_DATA_SIMULATED_NOT_LIVE'

export type DemoSeedEnvelope<T> = {
  tenantId: string
  dataState: 'DEMO'
  label: typeof DEMO_SEED_LABEL
  seededAt: string
  records: T[]
}

export function createDemoSeedEnvelope<T>(records: T[], options: { tenantId?: string; mode?: RuntimeDataMode; seededAt?: string } = {}): DemoSeedEnvelope<T> {
  const mode = options.mode ?? resolveRuntimeDataMode()
  assertDemoMode(mode)
  return {
    tenantId: options.tenantId ?? DEMO_SEED_TENANT_ID,
    dataState: 'DEMO',
    label: DEMO_SEED_LABEL,
    seededAt: options.seededAt ?? '2026-05-16T00:00:00.000Z',
    records,
  }
}
