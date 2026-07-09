// Shared executive component library — canonical barrel for all platform-wide components.
// Pages should import from here rather than from individual component paths.

// ─── Executive components ─────────────────────────────────────────────────────
export { StatusChip, statusToneFor } from '../executive/StatusChip'
export type { StatusChipTone, StatusTone } from '../executive/StatusChip'
export { MetricCard } from '../executive/MetricCard'
export { ExecutivePageHeader } from '../executive/ExecutivePageHeader'
export type { ExecutivePageHeaderChip } from '../executive/ExecutivePageHeader'
export { ValueLifecycle } from '../executive/ValueLifecycle'
export { ExecutivePageShell } from '../executive/ExecutivePageShell'
export { ExecutiveKpiCard } from '../executive/ExecutiveKpiCard'
export { ExecutiveSection } from '../executive/ExecutiveSection'
export { RiskBadge } from '../executive/RiskBadge'
export { StatusBadge } from '../executive/StatusBadge'
export { EvidenceBadge } from '../executive/EvidenceBadge'
export { EmptyState } from '../executive/EmptyState'
export { DemoModeBanner } from '../executive/DemoModeBanner'
export { ExecutiveBarChart } from '../executive/ExecutiveBarChart'
export { ExecutiveDonutChart } from '../executive/ExecutiveDonutChart'
export { WorkspaceModeBanner } from '../executive/WorkspaceModeBanner'

// ─── Shared atomic components ─────────────────────────────────────────────────
export { ExecutiveHealthBar } from './ExecutiveHealthBar'
export type { ExecutiveHealthBarProps } from './ExecutiveHealthBar'
export { DataStateBanner } from './DataStateBanner'

// ─── Archetypes ───────────────────────────────────────────────────────────────
export {
  ExecutiveDashboardLayout,
  LifecycleDashboardLayout,
  WorkflowDashboardLayout,
  DiscoveryDashboardLayout,
  RegistryDashboardLayout,
  OperationsDashboardLayout,
  ArchetypeLayout,
} from '../archetypes'
