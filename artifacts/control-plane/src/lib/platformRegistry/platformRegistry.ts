// Platform Page Registry — single source of truth for every page's metadata.
// This registry drives sidebar workspace grouping, archetype selection, and
// per-page executive questions. No routing changes required.

// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkspaceId =
  | 'EXECUTIVE'
  | 'DISCOVERY'
  | 'EXECUTION'
  | 'VALUE'
  | 'EVIDENCE'
  | 'PLATFORM'

export type ArchetypeId =
  | 'EXECUTIVE_DASHBOARD'
  | 'LIFECYCLE_DASHBOARD'
  | 'WORKFLOW_DASHBOARD'
  | 'DISCOVERY_DASHBOARD'
  | 'REGISTRY_DASHBOARD'
  | 'OPERATIONS_DASHBOARD'

export type PersonaId =
  | 'CIO'
  | 'CFO'
  | 'ITAM'
  | 'FINOPS'
  | 'OPERATOR'
  | 'AUDITOR'

export interface PlatformPageDefinition {
  id: string
  title: string
  workspace: WorkspaceId
  archetype: ArchetypeId
  executiveQuestion: string
  primaryPersona: PersonaId
  primaryDecision: string
  href: string
  icon: string
  ordering: number
}

// ─── Workspace display labels ─────────────────────────────────────────────────

export const WORKSPACE_DISPLAY_LABELS: Record<WorkspaceId, string> = {
  EXECUTIVE:  'COMMAND',
  DISCOVERY:  'DISCOVER',
  EXECUTION:  'EXECUTE',
  VALUE:      'VALUE',
  EVIDENCE:   'EVIDENCE',
  PLATFORM:   'PLATFORM',
}

// ─── Archetype layout descriptions ───────────────────────────────────────────

export const ARCHETYPE_META: Record<ArchetypeId, { label: string; purpose: string; sections: string[] }> = {
  EXECUTIVE_DASHBOARD: {
    label: 'Executive Dashboard',
    purpose: 'What requires my attention?',
    sections: ['Executive Hero', 'Executive Narrative', 'Visual Summary', 'Attention', 'Actions'],
  },
  LIFECYCLE_DASHBOARD: {
    label: 'Lifecycle Dashboard',
    purpose: 'How is value progressing?',
    sections: ['Hero', 'Waterfall', 'Pipeline', 'Leakage', 'Timeline', 'Ledger'],
  },
  WORKFLOW_DASHBOARD: {
    label: 'Workflow Dashboard',
    purpose: 'What work needs to happen?',
    sections: ['Hero', 'Queue', 'Pipeline', 'Decision Drawer', 'History'],
  },
  DISCOVERY_DASHBOARD: {
    label: 'Discovery Dashboard',
    purpose: 'Where are the opportunities?',
    sections: ['Coverage', 'Portfolio', 'Heatmap', 'Recommendations', 'Explorer'],
  },
  REGISTRY_DASHBOARD: {
    label: 'Registry Dashboard',
    purpose: 'Can we prove it?',
    sections: ['Health', 'Relationships', 'Timeline', 'Evidence', 'Audit'],
  },
  OPERATIONS_DASHBOARD: {
    label: 'Operations Dashboard',
    purpose: 'Is the platform healthy?',
    sections: ['Platform Health', 'Jobs', 'Logs', 'Configuration'],
  },
}

// ─── Page registry ────────────────────────────────────────────────────────────

export const PLATFORM_PAGES: PlatformPageDefinition[] = [

  // ── EXECUTIVE workspace ─────────────────────────────────────────────────────

  {
    id: 'executive-command-center',
    title: 'Executive Command Center',
    workspace: 'EXECUTIVE',
    archetype: 'EXECUTIVE_DASHBOARD',
    executiveQuestion: 'What requires my attention?',
    primaryPersona: 'CIO',
    primaryDecision: 'Where must I act today?',
    href: '/overview',
    icon: 'LayoutDashboard',
    ordering: 1,
  },
  {
    id: 'executive-value',
    title: 'Executive Value',
    workspace: 'EXECUTIVE',
    archetype: 'LIFECYCLE_DASHBOARD',
    executiveQuestion: 'What value has been realised?',
    primaryPersona: 'CFO',
    primaryDecision: 'Is the economic case proven?',
    href: '/executive-value',
    icon: 'TrendingUp',
    ordering: 2,
  },
  {
    id: 'executive-risk',
    title: 'Executive Risk',
    workspace: 'EXECUTIVE',
    archetype: 'EXECUTIVE_DASHBOARD',
    executiveQuestion: 'What are the top risks?',
    primaryPersona: 'CIO',
    primaryDecision: 'Which risks require escalation?',
    href: '/executive-risk',
    icon: 'ShieldCheck',
    ordering: 3,
  },

  // ── DISCOVERY workspace ─────────────────────────────────────────────────────

  {
    id: 'exposure-report',
    title: 'Exposure Report',
    workspace: 'DISCOVERY',
    archetype: 'DISCOVERY_DASHBOARD',
    executiveQuestion: 'Where is the technology exposure?',
    primaryPersona: 'CIO',
    primaryDecision: 'What requires immediate remediation?',
    href: '/executive/exposure-report',
    icon: 'FileText',
    ordering: 10,
  },
  {
    id: 'technology-portfolio',
    title: 'Technology Portfolio',
    workspace: 'DISCOVERY',
    archetype: 'DISCOVERY_DASHBOARD',
    executiveQuestion: 'What do we own?',
    primaryPersona: 'ITAM',
    primaryDecision: 'What can be rationalised?',
    href: '/technology-portfolio',
    icon: 'TrendingUp',
    ordering: 11,
  },
  {
    id: 'connectors',
    title: 'Connectors',
    workspace: 'DISCOVERY',
    archetype: 'OPERATIONS_DASHBOARD',
    executiveQuestion: 'What data sources are connected?',
    primaryPersona: 'OPERATOR',
    primaryDecision: 'What needs to be onboarded?',
    href: '/connectors',
    icon: 'Plug',
    ordering: 12,
  },
  {
    id: 'tenant-readiness',
    title: 'Tenant Readiness',
    workspace: 'DISCOVERY',
    archetype: 'OPERATIONS_DASHBOARD',
    executiveQuestion: 'Is this tenant ready for execution?',
    primaryPersona: 'OPERATOR',
    primaryDecision: 'What is blocking production execution?',
    href: '/workspace',
    icon: 'LayoutDashboard',
    ordering: 13,
  },
  {
    id: 'ai-saas-discovery',
    title: 'AI & SaaS Discovery',
    workspace: 'DISCOVERY',
    archetype: 'DISCOVERY_DASHBOARD',
    executiveQuestion: 'Where is shadow AI and SaaS exposure?',
    primaryPersona: 'CIO',
    primaryDecision: 'What ungoverned tools exist?',
    href: '/ai-governance',
    icon: 'FileSearch',
    ordering: 14,
  },

  // ── EXECUTION workspace ─────────────────────────────────────────────────────

  {
    id: 'execution-center',
    title: 'Execution Center',
    workspace: 'EXECUTION',
    archetype: 'WORKFLOW_DASHBOARD',
    executiveQuestion: 'What can safely be executed?',
    primaryPersona: 'OPERATOR',
    primaryDecision: 'What meets the trust threshold for automation?',
    href: '/actions',
    icon: 'Target',
    ordering: 20,
  },
  {
    id: 'approval-center',
    title: 'Approval Center',
    workspace: 'EXECUTION',
    archetype: 'WORKFLOW_DASHBOARD',
    executiveQuestion: 'What decisions are waiting?',
    primaryPersona: 'CIO',
    primaryDecision: 'What requires human sign-off?',
    href: '/approvals',
    icon: 'Target',
    ordering: 21,
  },

  // ── VALUE workspace ─────────────────────────────────────────────────────────

  {
    id: 'outcome-ledger',
    title: 'Outcome Ledger',
    workspace: 'VALUE',
    archetype: 'LIFECYCLE_DASHBOARD',
    executiveQuestion: 'Did we realise value?',
    primaryPersona: 'CFO',
    primaryDecision: 'Is the financial chain of custody complete?',
    href: '/outcomes',
    icon: 'BookOpen',
    ordering: 30,
  },
  {
    id: 'outcome-finance',
    title: 'Outcome Finance',
    workspace: 'VALUE',
    archetype: 'REGISTRY_DASHBOARD',
    executiveQuestion: 'Has finance confirmed the savings?',
    primaryPersona: 'CFO',
    primaryDecision: 'What savings are finance-validated?',
    href: '/executive/outcome-finance',
    icon: 'BookMarked',
    ordering: 31,
  },
  {
    id: 'value-realisation',
    title: 'Value Realisation',
    workspace: 'VALUE',
    archetype: 'LIFECYCLE_DASHBOARD',
    executiveQuestion: 'How is the value lifecycle progressing?',
    primaryPersona: 'CFO',
    primaryDecision: 'Where is value leaking?',
    href: '/execution',
    icon: 'Play',
    ordering: 32,
  },

  // ── EVIDENCE workspace ──────────────────────────────────────────────────────

  {
    id: 'evidence-registry',
    title: 'Evidence Registry',
    workspace: 'EVIDENCE',
    archetype: 'REGISTRY_DASHBOARD',
    executiveQuestion: 'Can we prove every claim?',
    primaryPersona: 'AUDITOR',
    primaryDecision: 'What evidence is missing or expired?',
    href: '/evidence',
    icon: 'FileText',
    ordering: 40,
  },
  {
    id: 'authority-catalog',
    title: 'Authority Catalog',
    workspace: 'EVIDENCE',
    archetype: 'REGISTRY_DASHBOARD',
    executiveQuestion: 'Are our authority sources trustworthy?',
    primaryPersona: 'AUDITOR',
    primaryDecision: 'Which authorities need attention?',
    href: '/intelligence/authority-catalog',
    icon: 'BookMarked',
    ordering: 41,
  },
  {
    id: 'executive-proof-packs',
    title: 'Executive Proof Packs',
    workspace: 'EVIDENCE',
    archetype: 'REGISTRY_DASHBOARD',
    executiveQuestion: 'Can I present this to the board?',
    primaryPersona: 'CIO',
    primaryDecision: 'What is ready for executive reporting?',
    href: '/workspace',
    icon: 'BookMarked',
    ordering: 42,
  },

  // ── PLATFORM workspace ──────────────────────────────────────────────────────

  {
    id: 'platform-operations',
    title: 'Platform Operations',
    workspace: 'PLATFORM',
    archetype: 'OPERATIONS_DASHBOARD',
    executiveQuestion: 'Is the platform healthy?',
    primaryPersona: 'OPERATOR',
    primaryDecision: 'What infrastructure issues need resolution?',
    href: '/platform',
    icon: 'ShieldCheck',
    ordering: 50,
  },
  {
    id: 'settings',
    title: 'Settings',
    workspace: 'PLATFORM',
    archetype: 'OPERATIONS_DASHBOARD',
    executiveQuestion: 'Is the platform correctly configured?',
    primaryPersona: 'OPERATOR',
    primaryDecision: 'What configuration changes are required?',
    href: '/settings',
    icon: 'Settings',
    ordering: 51,
  },
  {
    id: 'runtime',
    title: 'Runtime',
    workspace: 'PLATFORM',
    archetype: 'OPERATIONS_DASHBOARD',
    executiveQuestion: 'Is runtime health nominal?',
    primaryPersona: 'OPERATOR',
    primaryDecision: 'What runtime issues require intervention?',
    href: '/platform',
    icon: 'Activity',
    ordering: 52,
  },
]

// ─── Lookup helpers ───────────────────────────────────────────────────────────

export function getPlatformPageById(id: string): PlatformPageDefinition | undefined {
  return PLATFORM_PAGES.find(p => p.id === id)
}

export function getPlatformPageByHref(href: string): PlatformPageDefinition | undefined {
  return PLATFORM_PAGES.find(p => p.href === href)
}

export function getPagesByWorkspace(workspace: WorkspaceId): PlatformPageDefinition[] {
  return PLATFORM_PAGES.filter(p => p.workspace === workspace).sort((a, b) => a.ordering - b.ordering)
}

export function getPagesByArchetype(archetype: ArchetypeId): PlatformPageDefinition[] {
  return PLATFORM_PAGES.filter(p => p.archetype === archetype)
}

export function getWorkspaceForHref(href: string): WorkspaceId | undefined {
  return getPlatformPageByHref(href)?.workspace
}
