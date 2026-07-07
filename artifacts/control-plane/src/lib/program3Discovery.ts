export const program3DiscoveryQuestion = 'Where are the verified opportunities to reduce waste, improve control, reduce risk, recover value, or create measurable business outcomes across our technology estate?'

export const discoveryDecisions = ['EXECUTE', 'APPROVE', 'REVIEW', 'ASSIGN_OWNER', 'OPTIMISE', 'CONSOLIDATE', 'RETIRE', 'PROTECT', 'BLOCKED'] as const
export type DiscoveryDecision = (typeof discoveryDecisions)[number]
export type DiscoveryEvidenceStatus = 'COMPLETE' | 'PARTIAL'
export type DiscoveryReadiness = 'EXECUTION_READY' | 'APPROVAL_REQUIRED' | 'REVIEW_REQUIRED' | 'OWNER_REQUIRED' | 'BLOCKED'

export type DiscoveryOpportunity = {
  id: string
  domain: 'M365 Discovery' | 'SaaS Discovery' | 'AI Discovery' | 'AWS Discovery' | 'Azure Discovery' | 'Snowflake Discovery' | 'Databricks Discovery' | 'ServiceNow Discovery' | 'Flexera / ITAM Discovery'
  sourceSystem: string
  opportunityType: string
  assetIdentifier: string
  assetName: string
  ownerStatus: 'ASSIGNED' | 'MISSING' | 'UNKNOWN'
  owner?: string
  businessUnit?: string
  costCentre?: string
  usageEvidence?: string
  spendOrValueBasis?: number
  riskBasis?: string
  recommendedDecision: DiscoveryDecision
  executionReadiness: DiscoveryReadiness
  verificationStatus: 'VERIFIED' | 'ESTIMATED' | 'MISSING_EVIDENCE'
  confidence: number
  timestamp?: string
  lineage?: string
  outcomeProtectionLinkage?: string
  requiresApproval?: boolean
  duplicateCapability?: boolean
  dormantOrUnused?: boolean
  protectedOutcomeRequired?: boolean
  missingCriticalEvidence?: boolean
  reason: string
}

export const discoveryDomains = [
  { key: 'm365', label: 'M365 Discovery', route: '/discovery/m365' },
  { key: 'saas', label: 'SaaS Discovery', route: '/discovery/saas' },
  { key: 'ai', label: 'AI Discovery', route: '/discovery/ai' },
  { key: 'cloud', label: 'Cloud / AWS / Azure Discovery', route: '/discovery/cloud' },
  { key: 'snowflake', label: 'Snowflake Discovery', route: '/discovery/snowflake' },
  { key: 'databricks', label: 'Databricks Discovery', route: '/discovery/databricks' },
  { key: 'servicenow', label: 'ServiceNow Discovery', route: '/discovery/servicenow' },
  { key: 'flexera', label: 'Flexera / ITAM Discovery', route: '/discovery/flexera' },
] as const

export const emptyDiscoveryOpportunities: DiscoveryOpportunity[] = []

export const demoDiscoveryOpportunities: DiscoveryOpportunity[] = [
  { id: 'disc-m365-unused-e5', domain: 'M365 Discovery', sourceSystem: 'Microsoft 365 usage and licence export', opportunityType: 'unused licences', assetIdentifier: 'm365:e5:inactive-users', assetName: 'Microsoft 365 E5 inactive user cohort', ownerStatus: 'ASSIGNED', owner: 'M365 Platform Lead', businessUnit: 'Corporate IT', costCentre: 'IT-100', usageEvidence: '94 inactive or disabled users with assigned E5 licences', spendOrValueBasis: 118000, riskBasis: 'Renewal risk and reclaim opportunity before August renewal', recommendedDecision: 'EXECUTE', executionReadiness: 'EXECUTION_READY', verificationStatus: 'VERIFIED', confidence: 93, timestamp: '2026-07-06T00:00:00Z', lineage: 'm365/licences/inactive-users', outcomeProtectionLinkage: 'outcome:m365:licence-recovery', reason: 'Complete evidence and controlled reclaim action are ready.' },
  { id: 'disc-saas-collab-duplicate', domain: 'SaaS Discovery', sourceSystem: 'SaaS inventory + SSO + contracts', opportunityType: 'duplicate capability', assetIdentifier: 'capability:collaboration', assetName: 'Slack, Teams, Zoom and Miro overlap', ownerStatus: 'ASSIGNED', owner: 'Collaboration Portfolio Owner', businessUnit: 'Operations', costCentre: 'OPS-210', usageEvidence: 'Four collaboration tools overlap across 3,400 users', spendOrValueBasis: 186000, riskBasis: 'Duplicate capability and contract overlap', recommendedDecision: 'CONSOLIDATE', executionReadiness: 'APPROVAL_REQUIRED', verificationStatus: 'VERIFIED', confidence: 87, timestamp: '2026-07-06T00:00:00Z', lineage: 'saas/sso/contracts/overlap', outcomeProtectionLinkage: 'outcome:saas:rationalisation', requiresApproval: true, duplicateCapability: true, reason: 'Duplicate capability evidence supports consolidation with approval.' },
  { id: 'disc-ai-shadow-tool', domain: 'AI Discovery', sourceSystem: 'OAuth, expense and AI gateway discovery', opportunityType: 'shadow AI', assetIdentifier: 'ai:shadow-notes', assetName: 'Unapproved AI Notes App', ownerStatus: 'MISSING', usageEvidence: '34 users granted OAuth scopes to unapproved AI note taker', spendOrValueBasis: 72000, riskBasis: 'Data exposure and no accountable owner', recommendedDecision: 'ASSIGN_OWNER', executionReadiness: 'OWNER_REQUIRED', verificationStatus: 'VERIFIED', confidence: 82, timestamp: '2026-07-06T00:00:00Z', lineage: 'oauth/ai/expense', outcomeProtectionLinkage: 'protection:ai:data-exposure', reason: 'Missing owner blocks governance decision until accountability is assigned.' },
  { id: 'disc-aws-idle-ec2', domain: 'AWS Discovery', sourceSystem: 'AWS Cost Explorer and CloudWatch', opportunityType: 'idle compute', assetIdentifier: 'aws:ec2:i-0idle', assetName: 'Idle EC2 analytics worker', ownerStatus: 'ASSIGNED', owner: 'Cloud Platform Owner', businessUnit: 'Engineering', costCentre: 'CLOUD-700', usageEvidence: 'CPU below 2% for 30 days', spendOrValueBasis: 54000, riskBasis: 'Unmanaged spend and tagging gap', recommendedDecision: 'OPTIMISE', executionReadiness: 'REVIEW_REQUIRED', verificationStatus: 'ESTIMATED', confidence: 74, timestamp: '2026-07-06T00:00:00Z', lineage: 'aws/cost-explorer/cloudwatch', reason: 'Estimated value requires review before optimisation.' },
  { id: 'disc-azure-oversized', domain: 'Azure Discovery', sourceSystem: 'Azure Advisor and billing export', opportunityType: 'oversized resource', assetIdentifier: 'azure:vm:oversized-api', assetName: 'Oversized API VM scale set', ownerStatus: 'ASSIGNED', owner: 'API Platform Owner', businessUnit: 'Digital', costCentre: 'DIG-310', usageEvidence: 'Peak CPU under 18% and memory under 30%', spendOrValueBasis: 62000, riskBasis: 'High-cost anomaly and rightsize opportunity', recommendedDecision: 'APPROVE', executionReadiness: 'APPROVAL_REQUIRED', verificationStatus: 'VERIFIED', confidence: 86, timestamp: '2026-07-06T00:00:00Z', lineage: 'azure/advisor/billing', requiresApproval: true, reason: 'Rightsize action is evidenced but requires approval due service blast radius.' },
  { id: 'disc-snowflake-auto-suspend', domain: 'Snowflake Discovery', sourceSystem: 'Snowflake query history', opportunityType: 'auto-suspend gap', assetIdentifier: 'snowflake:warehouse:FIN_XL', assetName: 'Finance XL warehouse', ownerStatus: 'ASSIGNED', owner: 'Data Platform Lead', businessUnit: 'Finance Analytics', costCentre: 'DATA-400', usageEvidence: 'Warehouse idles 9 hours per day without auto-suspend', spendOrValueBasis: 96000, riskBasis: 'Value leakage from idle warehouse', recommendedDecision: 'OPTIMISE', executionReadiness: 'EXECUTION_READY', verificationStatus: 'VERIFIED', confidence: 91, timestamp: '2026-07-06T00:00:00Z', lineage: 'snowflake/query-history/warehouse-metering', outcomeProtectionLinkage: 'outcome:data:auto-suspend', reason: 'Verified utilisation and spend evidence support optimisation.' },
  { id: 'disc-databricks-idle-cluster', domain: 'Databricks Discovery', sourceSystem: 'Databricks jobs and cluster usage', opportunityType: 'idle cluster', assetIdentifier: 'databricks:cluster:ml-dev', assetName: 'ML development all-purpose cluster', ownerStatus: 'UNKNOWN', businessUnit: 'Data Science', costCentre: 'DATA-410', usageEvidence: 'Cluster active outside job windows', spendOrValueBasis: 48000, riskBasis: 'Policy gap and untagged job owner', recommendedDecision: 'REVIEW', executionReadiness: 'REVIEW_REQUIRED', verificationStatus: 'ESTIMATED', confidence: 69, timestamp: '2026-07-06T00:00:00Z', lineage: 'databricks/clusters/jobs', reason: 'Estimated value and unknown owner require review.' },
  { id: 'disc-servicenow-stale-ci', domain: 'ServiceNow Discovery', sourceSystem: 'ServiceNow CMDB and change records', opportunityType: 'stale service', assetIdentifier: 'servicenow:ci:legacy-api', assetName: 'Legacy API service CI', ownerStatus: 'MISSING', usageEvidence: 'No change or incident activity for 180 days', riskBasis: 'Disconnected change evidence and no service owner', recommendedDecision: 'BLOCKED', executionReadiness: 'BLOCKED', verificationStatus: 'MISSING_EVIDENCE', confidence: 31, timestamp: '2026-07-06T00:00:00Z', lineage: 'servicenow/cmdb/change', missingCriticalEvidence: true, reason: 'Missing critical owner and usage evidence blocks execution.' },
  { id: 'disc-flexera-entitlement', domain: 'Flexera / ITAM Discovery', sourceSystem: 'Flexera entitlement position', opportunityType: 'entitlement mismatch', assetIdentifier: 'flexera:m365:e3-e5', assetName: 'M365 E3/E5 entitlement mismatch', ownerStatus: 'ASSIGNED', owner: 'IT Asset Manager', businessUnit: 'Corporate IT', costCentre: 'IT-100', usageEvidence: 'Entitlements exceed consumed licences by 94 seats', spendOrValueBasis: 88000, riskBasis: 'Shelfware and renewal exposure', recommendedDecision: 'RETIRE', executionReadiness: 'APPROVAL_REQUIRED', verificationStatus: 'VERIFIED', confidence: 89, timestamp: '2026-07-06T00:00:00Z', lineage: 'flexera/entitlements/usage', requiresApproval: true, dormantOrUnused: true, reason: 'Dormant entitlement evidence supports retirement with approval.' },
]

export function getDiscoveryEvidencePackCompleteness(input: Partial<DiscoveryOpportunity>): { status: DiscoveryEvidenceStatus; missing: string[] } {
  const required: Array<[keyof DiscoveryOpportunity, string]> = [
    ['sourceSystem', 'Discovery source system'], ['opportunityType', 'Opportunity type'], ['assetIdentifier', 'Asset/resource/application identifier'], ['ownerStatus', 'Owner or owner-status'], ['usageEvidence', 'Usage/utilisation evidence'], ['recommendedDecision', 'Recommended decision'], ['executionReadiness', 'Execution readiness'], ['verificationStatus', 'Verification status'], ['confidence', 'Confidence'], ['timestamp', 'Timestamp'], ['lineage', 'Lineage'],
  ]
  const missing = required.filter(([key]) => input[key] === undefined || input[key] === '').map(([, label]) => label)
  if ((input.spendOrValueBasis === undefined && input.riskBasis === undefined)) missing.push('Spend/value/risk basis')
  return { status: missing.length ? 'PARTIAL' : 'COMPLETE', missing }
}

export function inferDiscoveryDecision(input: Partial<DiscoveryOpportunity>): { decision: DiscoveryDecision; reason: string } {
  if (input.missingCriticalEvidence || input.verificationStatus === 'MISSING_EVIDENCE') return { decision: 'BLOCKED', reason: 'Missing critical discovery evidence blocks action.' }
  if (input.ownerStatus === 'MISSING') return { decision: 'ASSIGN_OWNER', reason: 'Missing owner requires accountability before action.' }
  if (input.requiresApproval) return { decision: 'APPROVE', reason: 'Evidence exists but governance approval is required.' }
  if (input.verificationStatus === 'ESTIMATED') return { decision: 'REVIEW', reason: 'Estimated value or risk requires review.' }
  if (input.duplicateCapability) return { decision: 'CONSOLIDATE', reason: 'Duplicate capability evidence supports consolidation.' }
  if (input.dormantOrUnused) return { decision: 'RETIRE', reason: 'Dormant or unused evidence supports retirement.' }
  if (input.protectedOutcomeRequired) return { decision: 'PROTECT', reason: 'Protection outcome is required to prevent risk.' }
  if (input.executionReadiness === 'EXECUTION_READY') return { decision: 'EXECUTE', reason: 'Complete evidence and executable action are ready.' }
  return { decision: 'OPTIMISE', reason: 'Optimisation evidence supports governed action.' }
}

export function summarizeDiscoveryKpis(opportunities: DiscoveryOpportunity[]) {
  const complete = opportunities.filter((item) => getDiscoveryEvidencePackCompleteness(item).status === 'COMPLETE').length
  return {
    opportunitiesDiscovered: opportunities.length,
    executionReady: opportunities.filter((item) => item.executionReadiness === 'EXECUTION_READY').length,
    approvalRequired: opportunities.filter((item) => item.executionReadiness === 'APPROVAL_REQUIRED').length,
    missingOwner: opportunities.filter((item) => item.ownerStatus === 'MISSING').length,
    valueUnderReview: opportunities.filter((item) => item.verificationStatus === 'ESTIMATED').reduce((sum, item) => sum + (item.spendOrValueBasis ?? 0), 0),
    estimatedOpportunity: opportunities.reduce((sum, item) => sum + (item.spendOrValueBasis ?? 0), 0),
    riskExposure: opportunities.filter((item) => item.riskBasis).length,
    duplicateCapability: opportunities.filter((item) => item.duplicateCapability).length,
    dormantAssets: opportunities.filter((item) => item.dormantOrUnused).length,
    evidenceCompleteness: opportunities.length ? Math.round((complete / opportunities.length) * 100) : undefined,
    connectedSources: opportunities.length ? new Set(opportunities.map((item) => item.sourceSystem)).size : 0,
  }
}

export function program3LiveUnconnectedCopy(domain = 'Discovery') {
  return `${domain} requires connected source systems. No demo opportunities, applications, resources, AI tools, owners, spend, savings, risk values, decisions or execution readiness are shown in live-unconnected mode.`
}
