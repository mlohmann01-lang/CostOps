// Six Page Archetypes — reusable structural layout wrappers.
//
// Each archetype is a thin wrapper that:
//   1. Marks the page with data-archetype for tooling / testing
//   2. Declares the canonical section order for that pattern
//   3. Is transparent — it does not impose its own visual styling
//
// Pages compose their sections internally; the archetype simply names the pattern.

import React from 'react'
import type { ReactNode } from 'react'
import type { ArchetypeId } from '../../lib/platformRegistry/platformRegistry'

interface ArchetypeProps {
  children: ReactNode
  pageId?: string
  className?: string
}

function ArchetypeWrapper({
  archetype,
  pageId,
  children,
  className,
}: ArchetypeProps & { archetype: ArchetypeId }) {
  return React.createElement(
    'div',
    {
      'data-archetype': archetype,
      ...(pageId ? { 'data-page-id': pageId } : {}),
      ...(className ? { className } : {}),
    },
    children,
  )
}

// ─── 1. Executive Dashboard ───────────────────────────────────────────────────
// Purpose: "What requires my attention?"
// Canonical section order: Executive Hero → Narrative → Visual Summary → Attention → Actions

export function ExecutiveDashboardLayout({ children, pageId, className }: ArchetypeProps) {
  return ArchetypeWrapper({ archetype: 'EXECUTIVE_DASHBOARD', pageId, children, className })
}

// ─── 2. Lifecycle Dashboard ───────────────────────────────────────────────────
// Purpose: "How is value progressing?"
// Canonical section order: Hero → Waterfall → Pipeline → Leakage → Timeline → Ledger

export function LifecycleDashboardLayout({ children, pageId, className }: ArchetypeProps) {
  return ArchetypeWrapper({ archetype: 'LIFECYCLE_DASHBOARD', pageId, children, className })
}

// ─── 3. Workflow Dashboard ────────────────────────────────────────────────────
// Purpose: "What work needs to happen?"
// Canonical section order: Hero → Queue → Pipeline → Decision Drawer → History

export function WorkflowDashboardLayout({ children, pageId, className }: ArchetypeProps) {
  return ArchetypeWrapper({ archetype: 'WORKFLOW_DASHBOARD', pageId, children, className })
}

// ─── 4. Discovery Dashboard ───────────────────────────────────────────────────
// Purpose: "Where are the opportunities?"
// Canonical section order: Coverage → Portfolio → Heatmap → Recommendations → Explorer

export function DiscoveryDashboardLayout({ children, pageId, className }: ArchetypeProps) {
  return ArchetypeWrapper({ archetype: 'DISCOVERY_DASHBOARD', pageId, children, className })
}

// ─── 5. Registry Dashboard ────────────────────────────────────────────────────
// Purpose: "Can we prove it?"
// Canonical section order: Health → Relationships → Timeline → Evidence → Audit

export function RegistryDashboardLayout({ children, pageId, className }: ArchetypeProps) {
  return ArchetypeWrapper({ archetype: 'REGISTRY_DASHBOARD', pageId, children, className })
}

// ─── 6. Operations Dashboard ──────────────────────────────────────────────────
// Purpose: "Is the platform healthy?"
// Canonical section order: Platform Health → Jobs → Logs → Configuration

export function OperationsDashboardLayout({ children, pageId, className }: ArchetypeProps) {
  return ArchetypeWrapper({ archetype: 'OPERATIONS_DASHBOARD', pageId, children, className })
}

// ─── Generic archetype by ID ──────────────────────────────────────────────────

const ARCHETYPE_COMPONENTS: Record<ArchetypeId, (props: ArchetypeProps) => React.ReactElement> = {
  EXECUTIVE_DASHBOARD:  ExecutiveDashboardLayout,
  LIFECYCLE_DASHBOARD:  LifecycleDashboardLayout,
  WORKFLOW_DASHBOARD:   WorkflowDashboardLayout,
  DISCOVERY_DASHBOARD:  DiscoveryDashboardLayout,
  REGISTRY_DASHBOARD:   RegistryDashboardLayout,
  OPERATIONS_DASHBOARD: OperationsDashboardLayout,
}

export function ArchetypeLayout({
  archetype,
  ...props
}: ArchetypeProps & { archetype: ArchetypeId }) {
  const Component = ARCHETYPE_COMPONENTS[archetype]
  return Component(props)
}
