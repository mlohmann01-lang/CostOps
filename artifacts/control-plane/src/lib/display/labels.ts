export const LABELS: Record<string, string> = {
  AI_ASSET: 'AI Asset',
  CLOUD: 'Cloud',
  SAAS: 'SaaS',
  SAAS_RATIONALISATION: 'SaaS Rationalisation',
  M365: 'Microsoft 365',
  OTHER: 'Other',
  VALUE_LEAKAGE: 'Value Leakage',
  OWNERSHIP_DRIFT: 'Ownership Drift',
  POLICY_DRIFT: 'Policy Drift',
  CREATE_NEW_GOVERNED_ACTION: 'Create Governed Action',
  REAPPLY_EXECUTION: 'Reapply Execution',
  MISSING_DATA: 'Data Pending',
  NOT_CONFIGURED: 'Not Configured',
  STALE: 'Needs Refresh',
  STUB: 'Preview',
  SIMULATED: 'Preview',
}

function titleCase(value: string): string {
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function displayLabel(value: string): string {
  if (value === null || value === undefined) return 'Not available'
  if (LABELS[value]) return LABELS[value]
  return titleCase(value)
}
