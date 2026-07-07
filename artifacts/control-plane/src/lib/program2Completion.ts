export const program2ExecutiveQuestion = 'Which technology investments require management attention, who owns them, when do they renew, how are they being used, what risks exist, and what management decisions should be made?'

export const program2Capabilities = [
  { key: 'portfolio', label: 'Technology Portfolio', route: '/technology-portfolio', status: 'COMPLETE' },
  { key: 'ownership', label: 'Ownership & Accountability', route: '/ownership', status: 'COMPLETE' },
  { key: 'vendors', label: 'Vendor Intelligence', route: '/vendor-intelligence', status: 'COMPLETE' },
  { key: 'utilisation', label: 'Utilisation Intelligence', route: '/utilization-intelligence', status: 'COMPLETE' },
  { key: 'renewals', label: 'Renewals', route: '/renewals', status: 'COMPLETE' },
  { key: 'evidence', label: 'Evidence Pack / Proof Pack', route: '/evidence', status: 'COMPLETE' },
] as const

export const program2CanonicalDecisions = ['KEEP', 'RENEW', 'OPTIMISE', 'CONSOLIDATE', 'RETIRE', 'REVIEW', 'BLOCKED'] as const
export type Program2Decision = (typeof program2CanonicalDecisions)[number]

export function program2LiveUnconnectedCopy(capability: string) {
  return `${capability} requires connected portfolio, identity, contract, usage, vendor and evidence sources. No demo assets, owners, renewals, vendors, utilisation, decisions, savings or confidence are shown in live-unconnected mode.`
}

export function renderProgram2WorkspaceState(inputs: { portfolioAssets: number; vendors: number; renewals: number; utilisationRecords: number; ownershipFindings: number; isDemo: boolean }) {
  return {
    question: program2ExecutiveQuestion,
    capabilities: program2Capabilities.map((capability) => capability.label),
    emptyLive: !inputs.isDemo && inputs.portfolioAssets + inputs.vendors + inputs.renewals + inputs.utilisationRecords + inputs.ownershipFindings === 0,
    hasDemoData: inputs.isDemo && inputs.portfolioAssets > 0 && inputs.vendors > 0 && inputs.renewals > 0 && inputs.utilisationRecords > 0 && inputs.ownershipFindings > 0,
  }
}
