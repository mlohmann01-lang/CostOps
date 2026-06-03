export type OperatingMode = 'DEMO' | 'PILOT' | 'PRODUCTION'

export interface OperatingModeConfig {
  mode: OperatingMode
  label: string
  dataSourceLabel: string
  executionModeLabel: string
  description: string
  bannerTitle: string
  bannerBody: string
}

const configs: Record<OperatingMode, OperatingModeConfig> = {
  DEMO: {
    mode: 'DEMO',
    label: 'Demo Mode',
    dataSourceLabel: 'Sample governance dataset',
    executionModeLabel: 'Execution disabled',
    description: 'Explore Certen using deterministic sample data.',
    bannerTitle: 'Workspace Mode: Demo',
    bannerBody: 'This workspace is currently displaying sample governance data. Connect a tenant to analyse live technology governance, risk and optimisation opportunities.',
  },
  PILOT: {
    mode: 'PILOT',
    label: 'Pilot Mode',
    dataSourceLabel: 'Connected tenant data',
    executionModeLabel: 'Approval-gated execution',
    description: 'Operate a governed design-partner pilot with real tenant data, approvals, evidence and outcome tracking.',
    bannerTitle: 'Workspace Mode: Pilot',
    bannerBody: 'This workspace is connected to tenant data for a governed pilot. Execution remains approval-gated with evidence capture and outcome tracking.',
  },
  PRODUCTION: {
    mode: 'PRODUCTION',
    label: 'Production Mode',
    dataSourceLabel: 'Live tenant data',
    executionModeLabel: 'Governed production controls',
    description: 'Continuously govern technology risk, optimisation, evidence, drift and outcomes across connected enterprise systems.',
    bannerTitle: 'Workspace Mode: Production',
    bannerBody: 'This workspace is operating against live tenant data with governed controls, evidence capture and continuous outcome tracking.',
  },
}

export const operatingModeOptions = [configs.DEMO, configs.PILOT, configs.PRODUCTION]

export function getOperatingModeConfig(mode: OperatingMode = 'DEMO'): OperatingModeConfig {
  return configs[mode] ?? configs.DEMO
}
