export const demoWorkspace = { mode: 'demo' as const, tenantId: 'demo-sandbox-tenant', tenantName: 'Demo workspace', dataReady: true }
export const demoCommandMetrics = { totalIdentified: 25000, eligibleNow: 11000, pendingApproval: 7000, blockedManual: 2000, verifiedSavings: 4200, pendingVerification: 3, failedVerification: 1, projectedValuePendingProof: 11200 }
export const demoPostureSignals = [
  { id: 'governance', label: 'Governance posture', value: '2 approval bottlenecks', href: '/approval-workflows', tone: 'amber' as const },
  { id: 'connectors', label: 'Connector health', value: '4/5 connectors healthy', href: '/connectors', tone: 'amber' as const },
  { id: 'drift', label: 'Drift exposure', value: '1 active drift alert', href: '/drift', tone: 'amber' as const },
]
export const demoActions = [
  { id:'1', action:'M365 reclaim cohort with stale identity evidence', domain:'saas', saving:2000, verdict:'never-eligible', blast:'Medium', rollback:'None' },
  { id:'2', action:'AWS rightsize recommendation batch', domain:'cloud', saving:7000, verdict:'approval-required', blast:'Medium', rollback:'Full' },
  { id:'3', action:'OpenAI model route policy update', domain:'ai', saving:11000, verdict:'eligible', blast:'Medium', rollback:'Full' },
  { id:'4', action:'Snowflake warehouse auto-suspend (XL)', domain:'data', saving:9000, verdict:'eligible', blast:'Low', rollback:'Full' },
  { id:'5', action:'Azure reserved instance — D-series 1yr', domain:'cloud', saving:4000, verdict:'approval-required', blast:'High', rollback:'None' },
  { id:'6', action:'Inactive Copilot licences — Wave 2', domain:'saas', saving:18000, verdict:'eligible', blast:'Low', rollback:'Full' },
  { id:'7', action:'ServiceNow CMDB sync decommission', domain:'itam', saving:240, verdict:'blocked', blast:'Low', rollback:'Full' },
  { id:'8', action:'GCP Committed Use Discount — compute', domain:'cloud', saving:6000, verdict:'approval-required', blast:'Medium', rollback:'Full' },
  { id:'9', action:'Zoom licence consolidation — Q2 audit', domain:'saas', saving:3000, verdict:'eligible', blast:'Low', rollback:'Full' },
  { id:'10', action:'Datadog retention tier optimisation', domain:'data', saving:1000, verdict:'eligible', blast:'Low', rollback:'Full' },
]

export const demoRecommendations = demoActions.map((a, i) => ({ ...a, confidence: [62, 74, 91, 88, 66, 95, 48, 72, 84, 79][i], proofChain: ['Evidence snapshot', 'Policy verdict', 'Execution readiness', 'Approval trace'] }))

export const demoCampaigns = [
  { id: 'c1', name: 'M365 Optimisation Wave — Q2', projectedSavings: 18200, progress: 62, approvals: { pending: 2, approved: 6, blocked: 1 } },
  { id: 'c2', name: 'Cloud Rightsizing — AWS East', projectedSavings: 27100, progress: 48, approvals: { pending: 3, approved: 5, blocked: 0 } },
  { id: 'c3', name: 'AI Runtime Optimisation', projectedSavings: 9600, progress: 55, approvals: { pending: 1, approved: 4, blocked: 0 } },
  { id: 'c4', name: 'Q1 SaaS Reclaim Wave', projectedSavings: 14300, progress: 100, approvals: { pending: 0, approved: 9, blocked: 0 } },
]

export const demoSchedule = {
  summary: { upcoming: 3, completed: 2, blocked: 1, projectedSavings: 33600 },
  upcoming: [
    { id: 'u1', name: 'Wednesday CAB window', readiness: 'Ready', rollback: 'Full', risk: 'Low', dependencies: 'AWS, Snowflake' },
    { id: 'u2', name: 'Weekend licence reclaim wave', readiness: 'Needs approver', rollback: 'Full', risk: 'Medium', dependencies: 'M365, Entra ID' },
    { id: 'u3', name: 'Model route optimisation slot', readiness: 'Ready', rollback: 'Partial', risk: 'Low', dependencies: 'OpenAI, Audit log' },
  ],
  past: [
    { id: 'p1', name: 'Q1 reclaim closeout', readiness: 'Complete', rollback: 'N/A', risk: 'Low', dependencies: 'M365' },
    { id: 'p2', name: 'RDS schedule execution', readiness: 'Complete', rollback: 'Full', risk: 'Medium', dependencies: 'AWS, CAB' },
  ],
}

export const demoApprovals = {
  summary: { pending: 2, approvedToday: 4, escalated: 1, averageSlaHours: 6 },
  pending: [
    { id: 'a1', item: 'AWS rightsize recommendation batch', stage: 'Finance review', approver: 'm.smith@acme.com', sla: '2h remaining' },
    { id: 'a2', item: 'M365 Optimisation Wave — Q2', stage: 'CAB approval', approver: 'cab-chair@acme.com', sla: 'Escalated (SLA breach)' },
  ],
  history: [
    { id: 'h1', item: 'Datadog retention tier optimisation', result: 'Approved', approver: 'j.doe@acme.com' },
    { id: 'h2', item: 'Snowflake warehouse auto-suspend (XL)', result: 'Approved', approver: 'system' },
    { id: 'h3', item: 'ServiceNow CMDB sync decommission', result: 'Rejected', approver: 'risk.office@acme.com' },
  ],
}


export const demoRuntimeHealth = {
  overallScore: 91,
  summary: 'Governance runtime operational',
  components: [
    { id: 'governance-runtime', name: 'Governance runtime', status: 'ready', wording: 'Governance runtime operational', detail: 'Policy decisions, approval gates, and proof assembly are processing normally.' },
    { id: 'connector-health', name: 'Connector health', status: 'degraded', wording: 'Connector degraded', detail: 'M365 evidence freshness is outside the target window; retries are queued.' },
    { id: 'evidence-pipeline', name: 'Evidence pipeline', status: 'ready', wording: 'Evidence pipeline healthy', detail: 'Evidence snapshots and certificate materialisation are current.' },
    { id: 'policy-evaluation', name: 'Policy evaluation', status: 'active', wording: 'Policy evaluation active', detail: 'Policy checks are evaluating eligible and approval-required actions.' },
    { id: 'verification-backlog', name: 'Verification backlog', status: 'pending', wording: 'Verification backlog detected', detail: 'Two savings verification jobs are awaiting connector confirmation.' },
  ],
  activeIssues: [
    { id: 'rh-1', severity: 'degraded', title: 'Connector degraded', owner: 'Connector Ops', nextStep: 'Retry M365 usage sync after Entra delta completes.' },
    { id: 'rh-2', severity: 'pending', title: 'Verification backlog detected', owner: 'Outcomes', nextStep: 'Prioritise Copilot Wave 2 and AWS East verification checks.' },
  ],
  recentEvents: [
    { id: 'rhe-1', at: '4m ago', event: 'Evidence pipeline healthy', detail: 'Certificate builder processed 12 proof bundles.' },
    { id: 'rhe-2', at: '18m ago', event: 'Policy evaluation active', detail: 'Approval thresholds refreshed from governance defaults.' },
    { id: 'rhe-3', at: '36m ago', event: 'Connector degraded', detail: 'M365 freshness breached 180 minute threshold.' },
  ],
}

export const demoConnectorOps = {
  summary: { configured: 5, healthy: 4, degraded: 1, failedJobs: 1 },
  connectors: [
    { id: 'm365', name: 'M365 / Entra ID', status: 'degraded', freshness: '3h stale', trust: 82, lastSync: '3h ago', failedJob: 'Usage delta timeout', nextRun: 'Retry queued in 12m' },
    { id: 'aws', name: 'AWS', status: 'ready', freshness: '12m fresh', trust: 96, lastSync: '12m ago', failedJob: 'None', nextRun: 'Hourly' },
    { id: 'azure', name: 'Azure', status: 'ready', freshness: '8m fresh', trust: 94, lastSync: '8m ago', failedJob: 'None', nextRun: 'Hourly' },
    { id: 'snowflake', name: 'Snowflake', status: 'ready', freshness: '4m fresh', trust: 97, lastSync: '4m ago', failedJob: 'None', nextRun: '30m' },
    { id: 'servicenow', name: 'ServiceNow ITAM', status: 'blocked', freshness: 'Never synced', trust: 0, lastSync: 'Never', failedJob: 'Credential not configured', nextRun: 'Configure required' },
  ],
}

export const demoEvidenceAudit = {
  stats: { governanceEvents: 10, certsIssued: 7, proofChains: 10, exportsReady: 2 },
  filters: ['Domain', 'Verdict', 'Actor', 'Certificate ID'],
  timeline: [
    { id: 'ea-1', at: '3m ago', title: 'Model route policy evaluated', certId: 'GEC-2026-05-22-AI-0001', actor: 'j.doe@acme.com', proofChain: ['Spend anomaly', 'Policy threshold', 'Approval not required', 'Rollback verified'] },
    { id: 'ea-2', at: '14h ago', title: 'M365 reclaim cohort blocked', certId: 'GEC-2026-05-18-BL-0001', actor: 'system', proofChain: ['Identity evidence stale', 'Connector degraded', 'Governance block', 'Manual review required'] },
    { id: 'ea-3', at: '2h ago', title: 'AWS rightsize batch submitted', certId: 'GEC-2026-05-28-AP-0001', actor: 'j.doe@acme.com', proofChain: ['Rightsize candidate', 'Blast radius medium', 'Approval required', 'Rollback available'] },
  ],
}

export const demoSecurity = {
  roles: [
    { role: 'Admin', review: true, approve: true, execute: true, configure: true },
    { role: 'Approver', review: true, approve: true, execute: false, configure: false },
    { role: 'Operator', review: true, approve: false, execute: true, configure: false },
    { role: 'Read-only observer', review: true, approve: false, execute: false, configure: false },
  ],
  sessions: [
    { id: 's1', user: 'j.doe@acme.com', role: 'Operator', status: 'active', lastSeen: '2m ago' },
    { id: 's2', user: 'm.smith@acme.com', role: 'Approver', status: 'active', lastSeen: '9m ago' },
    { id: 's3', user: 'risk.office@acme.com', role: 'Read-only observer', status: 'active', lastSeen: '18m ago' },
  ],
  tenant: { tenantId: 'demo-sandbox-tenant', isolation: 'Tenant scoped', authMode: 'Demo SSO', executionBoundary: 'Approval gated' },
}

export const demoSettings = {
  workspace: { tenantName: 'Demo workspace', tenantId: 'demo-sandbox-tenant', mode: 'DEMO', liveExecution: 'Disabled' },
  governanceDefaults: { approvalThreshold: '$5,000 monthly saving', rollbackRequired: 'Required for auto execution', blastRadius: 'Medium requires approval' },
  notifications: { approvals: 'Email + in-app', connectorDegraded: 'In-app', verificationBacklog: 'Daily digest' },
  retention: { evidence: '24 months', auditEvents: '36 months', exports: '90 days' },
  dangerZone: { deleteWorkspace: 'Disabled in demo', rotateTenantKeys: 'Disabled in demo' },
}

export const demoPriorityActions = [
  { id:'p1', text:'AWS rightsize batch awaiting second approver — 2h overdue', href:'/approval-workflows' },
  { id:'p2', text:'M365 connector degraded — stale identity evidence blocking reclaim cohort', href:'/connectors' },
  { id:'p3', text:'License reclaim recurrence watch active — review required', href:'/drift' },
]

export const demoConnectors = [
  { id:'m365', name:'M365 / Entra ID', health:'DEGRADED', synced:'3h ago', desc:'Identity · Licences · Usage · Entra ID · Exchange' },
  { id:'aws', name:'AWS', health:'HEALTHY', synced:'12m ago', desc:'Cloud spend · EC2 · S3 · RDS · Cost Explorer' },
  { id:'azure', name:'Azure', health:'HEALTHY', synced:'8m ago', desc:'Cloud spend · Cost Management · Advisor' },
  { id:'snowflake', name:'Snowflake', health:'HEALTHY', synced:'4m ago', desc:'Warehouse economics · query spend · credit burn' },
  { id:'servicenow', name:'ServiceNow ITAM', health:'UNAVAILABLE', synced:'Never', desc:'Asset inventory · hardware lifecycle · CMDB feed' },
]

export const demoGovernanceAuditLog = Array.from({length:10}).map((_,i)=>({ id:`g${i+1}`, at:['3m ago','14h ago','2h ago','5h ago','1d ago','2d ago','2d ago','3d ago','4d ago','5d ago'][i], action:['Model downgrade GPT-4 → GPT-3.5','M365 reclaim cohort blocked','AWS rightsize batch — pending','Snowflake auto-suspend executed','RDS Reserved — never eligible','Azure reserved instance submitted','Copilot licence Wave 2 approved','GCP Committed Use submitted','Zoom consolidation approved','Datadog retention approved'][i], verdict:['Eligible','Never eligible','Approval required','Eligible','Never eligible','Approval required','Eligible','Approval required','Eligible','Eligible'][i], certId:['GEC-2026-05-22-AI-0001','GEC-2026-05-18-BL-0001','GEC-2026-05-28-AP-0001','GEC-2026-05-22-DATA-003','—','GEC-2026-05-26-CL-0002','GEC-2026-05-26-M365-004','GEC-2026-05-25-CL-0003','GEC-2026-05-24-M365-005','GEC-2026-05-23-DATA-006'][i], actor:['j.doe@acme.com','system','j.doe@acme.com','system','system','j.doe@acme.com','m.smith@acme.com','j.doe@acme.com','m.smith@acme.com','system'][i] }))

export const demoExecution = { awaiting:[
  {id:'a1', action:'Inactive Copilot licences — Wave 2', actor:'j.doe@acme.com', at:'47m ago', risk:'Low', rollback:'Full', saving:18000},
  {id:'a2', action:'OpenAI route policy update', actor:'j.doe@acme.com', at:'2h ago', risk:'Low', rollback:'Full', saving:11200},
  {id:'a3', action:'Zoom licence consolidation — Q2 audit', actor:'m.smith@acme.com', at:'4h ago', risk:'Low', rollback:'Full', saving:3100},
], completed:[
  {id:'c1', action:'Snowflake ANALYTICS_WH auto-suspend', actor:'system', at:'4h ago', saving:9240, rollback:'Full', certId:'GEC-2026-05-22-DATA-003'},
  {id:'c2', action:'Model downgrade GPT-4 → GPT-3.5', actor:'j.doe', at:'1d ago', saving:1240, rollback:'Full', certId:'GEC-2026-05-22-AI-0001'},
  {id:'c3', action:'M365 Wave 1 licence reclaim', actor:'system', at:'2d ago', saving:14280, rollback:'Full', certId:'GEC-2026-05-20-M365-001'},
  {id:'c4', action:'Datadog retention tier', actor:'system', at:'3d ago', saving:1040, rollback:'Full', certId:'GEC-2026-05-23-DATA-006'},
]}

export const demoOutcomes = { stats:[24800,4200,-20600,3,1,1], ledger:[
  {id:'o1', action:'OpenAI route policy update', projected:11200, verified:4200, variance:-7000, confidence:'HIGH', evidence:'Available', state:'Verified', verificationStatus:'VERIFIED', verificationAge:'2h old', evidencePack:{ beforeState:{ monthlyCost:11200, routePolicy:'premium-default' }, afterState:{ monthlyCost:7000, routePolicy:'cost-optimised' }, verificationMethod:'Policy telemetry and invoice snapshot', evidenceSources:['Execution timeline','Usage telemetry','Invoice reference'], verificationConfidence:'HIGH', verificationStatus:'VERIFIED', executionTimeline:['Discovery','Recommendation','Approval','Execution','Verification','Outcome'], supportingEvidence:['Before snapshot','After snapshot','Invoice reference'] }},
  {id:'o2', action:'Snowflake auto-suspend', projected:9240, verified:null, variance:null, confidence:'MEDIUM', evidence:'Available', state:'Pending', verificationStatus:'PENDING', verificationAge:'Pending', evidencePack:{ beforeState:{ warehouses:4, monthlyCost:9240 }, afterState:{ warehouses:4, policy:'auto-suspend pending readback' }, verificationMethod:'Warehouse telemetry readback', evidenceSources:['Execution timeline','Snowflake warehouse snapshot'], verificationConfidence:'MEDIUM', verificationStatus:'PENDING', executionTimeline:['Discovery','Recommendation','Approval','Execution'], supportingEvidence:['Before snapshot'] }},
  {id:'o3', action:'M365 Wave 1 licence reclaim', projected:14280, verified:8400, variance:-5880, confidence:'HIGH', evidence:'Available', state:'Verified', verificationStatus:'VERIFIED', verificationAge:'1h old', evidencePack:{ beforeState:{ assignedLicenses:47, monthlyCost:3290 }, afterState:{ assignedLicenses:35, monthlyCost:2450 }, verificationMethod:'Graph assignment snapshot and SKU pricing', evidenceSources:['Graph assignment snapshot','Graph post-execution snapshot','SKU pricing reference'], verificationConfidence:'HIGH', verificationStatus:'VERIFIED', executionTimeline:['Discovery','Recommendation','Approval','Execution','Verification','Outcome'], supportingEvidence:['Before snapshot','After snapshot','Pricing reference'] }},
  {id:'o4', action:'Model downgrade GPT-4 → 3.5', projected:1240, verified:null, variance:null, confidence:'LOW', evidence:'—', state:'Failed', verificationStatus:'FAILED', verificationAge:'4h old', evidencePack:{ beforeState:{}, afterState:{}, verificationMethod:'Expected outcome only', evidenceSources:['Outcome ledger evidence'], verificationConfidence:'LOW', verificationStatus:'FAILED', executionTimeline:['Discovery','Recommendation','Approval','Execution','Verification'], supportingEvidence:['Failure reason: missing usage evidence'] }},
  {id:'o5', action:'Zoom consolidation — Q2', projected:3100, verified:null, variance:null, confidence:'LOW', evidence:'—', state:'Pending', verificationStatus:'PENDING', verificationAge:'Pending', evidencePack:{ beforeState:{}, afterState:{}, verificationMethod:'Expected outcome only', evidenceSources:['Outcome ledger evidence'], verificationConfidence:'LOW', verificationStatus:'PENDING', executionTimeline:['Discovery','Recommendation'], supportingEvidence:['Awaiting execution readback'] }},
]}

export const demoDrift = [
  {id:'d1', title:'License reclaim recurrence watch', status:'Active', risk:'Medium', atRisk:900},
  {id:'d2', title:'Snowflake warehouse resize drift', status:'Active', risk:'Low', atRisk:240},
  {id:'d3', title:'AWS rightsizing reversion risk', status:'Warning', risk:'Medium', atRisk:1400},
  {id:'d4', title:'Copilot licence reassignment', status:'Resolved', risk:'Low', atRisk:0},
]

export const demoIntelligence = { funnel:{ identified:76000, eligible:53320, pending:22440, realised:11730 } }

export const demoTrustSummary = {
  tenantId: 'demo-sandbox-tenant',
  globalTrustScore: 83,
  globalTrustBand: 'HIGH' as const,
  globalTrustLabel: 'High confidence with minor review items',
  globalTrustReasons: ['Most sources are fresh; ServiceNow requires review.', '4 stale sources and 2 identity conflicts affect readiness.'],
  executionEligibleValue: 42000,
  approvalRequiredValue: 18000,
  blockedByTrustValue: 9000,
  blockedByPolicyValue: 4000,
  manualOnlyValue: 2000,
  trustIssueCount: 13,
  identityConflictCount: 4,
  missingOwnerCount: 7,
  staleSourceCount: 2,
  connectorDegradedCount: 1,
  generatedAt: '2026-05-30T09:00:00.000Z',
}

export const demoConnectorTrust = [
  { connectorId: 'm365', connectorName: 'M365', platform: 'M365', trustScore: 92, trustBand: 'TRUSTED' as const, trustLabel: 'Trusted for governed execution', trustReasons: ['Identity, license and usage evidence are fresh.'], status: 'TRUSTED', lastSyncAt: '12m ago', freshnessStatus: 'Fresh', identityIssues: 0, missingOwnership: 1, staleRecords: 0, blockedRecommendationCount: 0, affectedValue: 18000 },
  { connectorId: 'aws', connectorName: 'AWS', platform: 'AWS', trustScore: 88, trustBand: 'HIGH' as const, trustLabel: 'High confidence with minor review items', trustReasons: ['Cost Explorer and inventory evidence are current.'], status: 'HIGH', lastSyncAt: '18m ago', freshnessStatus: 'Fresh', identityIssues: 1, missingOwnership: 1, staleRecords: 0, blockedRecommendationCount: 1, affectedValue: 22000 },
  { connectorId: 'snowflake', connectorName: 'Snowflake', platform: 'Snowflake', trustScore: 84, trustBand: 'HIGH' as const, trustLabel: 'High confidence with minor review items', trustReasons: ['Warehouse usage evidence is fresh; ownership review remains open.'], status: 'HIGH', lastSyncAt: '25m ago', freshnessStatus: 'Fresh', identityIssues: 0, missingOwnership: 2, staleRecords: 0, blockedRecommendationCount: 0, affectedValue: 15000 },
  { connectorId: 'servicenow', connectorName: 'ServiceNow', platform: 'ServiceNow', trustScore: 61, trustBand: 'INVESTIGATE' as const, trustLabel: 'Investigate before execution', trustReasons: ['Connector degraded and CMDB ownership evidence is stale.'], status: 'INVESTIGATE', lastSyncAt: '1d ago', freshnessStatus: 'Stale', identityIssues: 3, missingOwnership: 3, staleRecords: 2, blockedRecommendationCount: 3, affectedValue: 18000 },
]

export const demoTrustFindings = [
  { findingId: 'tf-identity-1', tenantId: 'demo-sandbox-tenant', findingType: 'IDENTITY_CONFLICT' as const, severity: 'HIGH' as const, entityType: 'USER', entityId: 'u-119', sourceSystem: 'ServiceNow', description: 'Identity Conflict blocks three reclaim recommendations.', affectedRecommendationIds: ['r-1','r-2','r-3'], affectedValue: 12400, status: 'OPEN' as const, remediationHint: 'Resolve Entra-to-CMDB identity mapping.', detectedAt: '2026-05-30T08:00:00.000Z' },
  { findingId: 'tf-owner-1', tenantId: 'demo-sandbox-tenant', findingType: 'MISSING_OWNER' as const, severity: 'MEDIUM' as const, entityType: 'COST_CENTRE', entityId: 'CC-220', sourceSystem: 'Snowflake', description: 'Missing Owner prevents approval routing.', affectedRecommendationIds: ['r-4'], affectedValue: 7200, status: 'OPEN' as const, remediationHint: 'Assign a cost owner for CC-220.', detectedAt: '2026-05-30T08:10:00.000Z' },
  { findingId: 'tf-stale-1', tenantId: 'demo-sandbox-tenant', findingType: 'STALE_SOURCE' as const, severity: 'MEDIUM' as const, entityType: 'CONNECTOR', entityId: 'servicenow', sourceSystem: 'ServiceNow', description: 'Stale Source exceeds freshness policy.', affectedRecommendationIds: ['r-5'], affectedValue: 5000, status: 'OPEN' as const, remediationHint: 'Refresh ServiceNow read-only sync.', detectedAt: '2026-05-30T08:20:00.000Z' },
  { findingId: 'tf-connector-1', tenantId: 'demo-sandbox-tenant', findingType: 'CONNECTOR_DEGRADED' as const, severity: 'MEDIUM' as const, entityType: 'CONNECTOR', entityId: 'servicenow', sourceSystem: 'ServiceNow', description: 'Connector Degraded reduces execution readiness.', affectedRecommendationIds: ['r-6'], affectedValue: 3800, status: 'OPEN' as const, remediationHint: 'Review connector credentials and last sync error.', detectedAt: '2026-05-30T08:30:00.000Z' },
]

export const demoExecutionReadiness = {
  executionEligibleValue: 42000,
  approvalRequiredValue: 18000,
  blockedByTrustValue: 9000,
  blockedByPolicyValue: 4000,
  manualOnlyValue: 2000,
  breakdown: [
    { category: 'EXECUTION_ELIGIBLE' as const, label: 'Execution Eligible', value: 42000, recommendationCount: 8, reasons: ['Trust and policy gates cleared.'] },
    { category: 'APPROVAL_REQUIRED' as const, label: 'Approval Required', value: 18000, recommendationCount: 4, reasons: ['Approver required for blast radius.'] },
    { category: 'BLOCKED_BY_TRUST' as const, label: 'Blocked By Trust', value: 9000, recommendationCount: 3, reasons: ['Identity and ownership evidence gaps.'] },
    { category: 'BLOCKED_BY_POLICY' as const, label: 'Blocked By Policy', value: 4000, recommendationCount: 2, reasons: ['Governance policy requires exception.'] },
    { category: 'MANUAL_ONLY' as const, label: 'Manual Only', value: 2000, recommendationCount: 1, reasons: ['No governed action adapter.'] },
  ],
}

export const demoRecommendationExplainability = {
  '1': { recommendationId: '1', tenantId: 'demo-sandbox-tenant', actionType: 'REMOVE_LICENSE', playbookId: 'M365_INACTIVE_USER_LICENSE_RECLAIM', currentState: 'BLOCKED', readinessState: 'BLOCKED_BY_TRUST', trustBand: 'INVESTIGATE', projectedSavings: 24000, blockedValue: 24000, unlockValue: 24000, explanationSummary: 'Blocked because usage evidence is stale. Resolve this issue to unlock $24,000 projected annual savings.', evidenceChain: [{ step: 'DISCOVERY_SOURCE', label: 'Discovery source', state: 'STALE', evidence: { source: 'M365 / Entra ID' } }, { step: 'READINESS_DECISION', label: 'Readiness decision', state: 'BLOCKED_BY_TRUST', evidence: { reason: 'STALE_SOURCE' } }, { step: 'POLICY_GATE', label: 'Policy gate', state: 'CLEARED', evidence: {} }], trustFindings: [{ findingId: 'tf-stale-identity', findingType: 'STALE_SOURCE', severity: 'MEDIUM', description: 'M365 reclaim blocked by stale identity evidence', affectedValue: 24000, status: 'OPEN' }], policyFindings: [], affectedEntities: [{ entityType: 'USER', entityId: 'u-m365-1', label: 'Inactive M365 user cohort' }], resolutionSteps: [{ blockerType: 'STALE_SOURCE', title: 'Refresh connector sync', description: 'Refresh M365 identity and license sync.', linkTarget: '/connector-ops', unlockValue: 24000, remediationOnly: true }] },
  '6': { recommendationId: '6', tenantId: 'demo-sandbox-tenant', actionType: 'RECLAIM_COPILOT_LICENSE', playbookId: 'M365_COPILOT_UTILISATION_V1', currentState: 'BLOCKED', readinessState: 'BLOCKED_BY_TRUST', trustBand: 'LOW_CONFIDENCE', projectedSavings: 18000, blockedValue: 18000, unlockValue: 18000, explanationSummary: 'Blocked because usage evidence is stale. Resolve this issue to unlock $18,000 projected annual savings.', evidenceChain: [{ step: 'DISCOVERY_SOURCE', label: 'Discovery source', state: 'PRESENT', evidence: { source: 'M365 usage reports' } }, { step: 'TRUST_SCORE_INPUTS', label: 'Trust score inputs', state: 'LOW_CONFIDENCE', evidence: { usageEvidence: 'STALE' } }, { step: 'READINESS_DECISION', label: 'Readiness decision', state: 'BLOCKED_BY_TRUST', evidence: { reason: 'MISSING_USAGE_EVIDENCE' } }], trustFindings: [{ findingId: 'tf-usage-copilot', findingType: 'MISSING_USAGE_EVIDENCE', severity: 'MEDIUM', description: 'Copilot reclaim blocked by stale usage data', affectedValue: 18000, status: 'OPEN' }], policyFindings: [], affectedEntities: [{ entityType: 'USER', entityId: 'u-copilot-1', label: 'Copilot Wave 2 cohort' }], resolutionSteps: [{ blockerType: 'MISSING_USAGE_EVIDENCE', title: 'Run usage ingestion', description: 'Run Copilot usage ingestion before reclaim.', linkTarget: '/connector-ops', unlockValue: 18000, remediationOnly: true }] },
  '2': { recommendationId: '2', tenantId: 'demo-sandbox-tenant', actionType: 'RIGHTSIZE_INSTANCE', playbookId: 'AWS_RIGHTSIZE_V1', currentState: 'APPROVAL_REQUIRED', readinessState: 'APPROVAL_REQUIRED', trustBand: 'HIGH', projectedSavings: 84000, blockedValue: 0, unlockValue: 0, explanationSummary: 'Approval required because blast radius is medium and owner evidence is incomplete.', evidenceChain: [{ step: 'DISCOVERY_SOURCE', label: 'Discovery source', state: 'PRESENT', evidence: { source: 'AWS Cost Explorer' } }, { step: 'POLICY_GATE', label: 'Policy gate', state: 'APPROVAL_REQUIRED', evidence: { reason: 'MISSING_OWNER' } }], trustFindings: [{ findingId: 'tf-owner-aws', findingType: 'MISSING_OWNER', severity: 'MEDIUM', description: 'AWS rightsizing blocked by missing owner', affectedValue: 84000, status: 'OPEN' }], policyFindings: [], affectedEntities: [{ entityType: 'ACCOUNT', entityId: 'aws-prod', label: 'AWS production account' }], resolutionSteps: [{ blockerType: 'MISSING_OWNER', title: 'Assign business owner or cost centre', description: 'Assign owner for AWS production account.', linkTarget: '/data-trust?findingType=MISSING_OWNER', unlockValue: 84000, remediationOnly: true }] },
}

export const demoTrustResolutionFindings = [
  { findingId: 'tf-identity-1', findingType: 'IDENTITY_CONFLICT', sourceSystem: 'ServiceNow', blockedValue: 12400, affectedRecommendations: [demoRecommendationExplainability['1'], demoRecommendationExplainability['6'], demoRecommendationExplainability['2']].slice(0, 3), resolutionSteps: [{ blockerType: 'IDENTITY_CONFLICT', title: 'Resolve identity match', description: 'Resolve ServiceNow identity mapping across affected recommendations.', linkTarget: '/connector-ops', unlockValue: 12400, remediationOnly: true }] },
  { findingId: 'tf-owner-1', findingType: 'MISSING_OWNER', sourceSystem: 'Snowflake', blockedValue: 7200, affectedRecommendations: [demoRecommendationExplainability['2']], resolutionSteps: demoRecommendationExplainability['2'].resolutionSteps },
  { findingId: 'tf-stale-1', findingType: 'STALE_SOURCE', sourceSystem: 'ServiceNow', blockedValue: 5000, affectedRecommendations: [demoRecommendationExplainability['1']], resolutionSteps: demoRecommendationExplainability['1'].resolutionSteps },
  { findingId: 'tf-connector-1', findingType: 'CONNECTOR_DEGRADED', sourceSystem: 'ServiceNow', blockedValue: 3800, affectedRecommendations: [demoRecommendationExplainability['1'], demoRecommendationExplainability['6']], resolutionSteps: [{ blockerType: 'CONNECTOR_DEGRADED', title: 'Refresh connector sync', description: 'Review connector credentials and rerun sync.', linkTarget: '/connector-ops', unlockValue: 3800, remediationOnly: true }] },
  { findingId: 'tf-servicenow-multi', findingType: 'IDENTITY_CONFLICT', sourceSystem: 'ServiceNow', blockedValue: 12400, affectedRecommendations: [demoRecommendationExplainability['1'], demoRecommendationExplainability['6'], demoRecommendationExplainability['2']].slice(0, 3), resolutionSteps: [{ blockerType: 'IDENTITY_CONFLICT', title: 'Resolve identity match', description: 'Resolve ServiceNow identity mapping across affected recommendations.', linkTarget: '/connector-ops', unlockValue: 12400, remediationOnly: true }] },
  { findingId: 'tf-owner-aws', findingType: 'MISSING_OWNER', sourceSystem: 'AWS', blockedValue: 84000, affectedRecommendations: [demoRecommendationExplainability['2']], resolutionSteps: demoRecommendationExplainability['2'].resolutionSteps },
  { findingId: 'tf-stale-identity', findingType: 'STALE_SOURCE', sourceSystem: 'M365', blockedValue: 24000, affectedRecommendations: [demoRecommendationExplainability['1']], resolutionSteps: demoRecommendationExplainability['1'].resolutionSteps },
]


export const demoTrustResolutionTasks = [
  { taskId: 'trt-demo-1', tenantId: 'demo-sandbox-tenant', findingId: 'tf-identity-1', affectedRecommendationIds: ['1','6'], taskType: 'IDENTITY_CONFLICT', title: 'Resolve identity match', description: 'Resolve Entra-to-CMDB identity mapping.', owner: 'IAM Team', ownerId: 'iam-team', ownerName: 'IAM Team', ownerType: 'TEAM' as const, assignedAt: '2026-05-27T08:00:00.000Z', status: 'OPEN' as const, priority: 'HIGH' as const, unlockValue: 12400, resolutionHint: 'Resolve identity mapping in Data Trust / Connector Ops.', slaHours: 24, dueAt: '2026-05-28T08:00:00.000Z', slaStatus: 'OVERDUE' as const, escalationLevel: 'MANAGER' as const, escalatedAt: '2026-05-29T08:00:00.000Z', escalationReason: 'Identity conflict exceeded high-priority SLA.', accountabilityStatus: 'ESCALATED' as const, createdAt: '2026-05-27T08:00:00.000Z', updatedAt: '2026-05-29T08:00:00.000Z', resolvedAt: null },
  { taskId: 'trt-demo-2', tenantId: 'demo-sandbox-tenant', findingId: 'tf-owner-1', affectedRecommendationIds: ['2'], taskType: 'MISSING_OWNER', title: 'Assign business owner', description: 'Assign business owner or cost centre before approval.', owner: 'IT Asset Management', ownerId: 'it-asset-management', ownerName: 'IT Asset Management', ownerType: 'TEAM' as const, assignedAt: '2026-05-28T12:00:00.000Z', status: 'OPEN' as const, priority: 'MEDIUM' as const, unlockValue: 7200, resolutionHint: 'Assign business owner or cost centre.', slaHours: 72, dueAt: '2026-05-31T12:00:00.000Z', slaStatus: 'AT_RISK' as const, escalationLevel: 'NONE' as const, accountabilityStatus: 'AT_RISK' as const, createdAt: '2026-05-28T12:00:00.000Z', updatedAt: '2026-05-28T12:00:00.000Z', resolvedAt: null },
  { taskId: 'trt-demo-3', tenantId: 'demo-sandbox-tenant', findingId: 'tf-stale-1', affectedRecommendationIds: ['1'], taskType: 'STALE_SOURCE', title: 'Refresh connector sync', description: 'Refresh source sync to restore evidence freshness.', owner: 'Connector Operations', ownerId: 'connector-operations', ownerName: 'Connector Operations', ownerType: 'TEAM' as const, assignedAt: '2026-05-30T06:00:00.000Z', status: 'IN_PROGRESS' as const, priority: 'MEDIUM' as const, unlockValue: 5000, resolutionHint: 'Refresh connector sync.', slaHours: 72, dueAt: '2026-06-02T06:00:00.000Z', slaStatus: 'ON_TRACK' as const, escalationLevel: 'NONE' as const, accountabilityStatus: 'ASSIGNED' as const, createdAt: '2026-05-30T06:00:00.000Z', updatedAt: '2026-05-30T06:00:00.000Z', resolvedAt: null },
  { taskId: 'trt-demo-4', tenantId: 'demo-sandbox-tenant', findingId: 'tf-connector-1', affectedRecommendationIds: ['1','6'], taskType: 'CONNECTOR_DEGRADED', title: 'Restore ServiceNow connector', description: 'Restore degraded connector before automated execution readiness.', owner: 'Platform Operations', ownerId: 'platform-operations', ownerName: 'Platform Operations', ownerType: 'TEAM' as const, assignedAt: '2026-05-27T03:00:00.000Z', status: 'OPEN' as const, priority: 'HIGH' as const, unlockValue: 3800, resolutionHint: 'Review connector credentials and rerun sync.', slaHours: 24, dueAt: '2026-05-28T03:00:00.000Z', slaStatus: 'OVERDUE' as const, escalationLevel: 'DIRECTOR' as const, escalatedAt: '2026-05-30T03:00:00.000Z', escalationReason: 'Connector degradation remains unresolved.', accountabilityStatus: 'ESCALATED' as const, createdAt: '2026-05-27T03:00:00.000Z', updatedAt: '2026-05-30T03:00:00.000Z', resolvedAt: null },
]

export const demoVendorIntelligence = {
  summary: { vendorChangesDetected: 12, highImpact: 3, affectedSpend: 420000, generatedOpportunities: 18 },
  signals: [
    { signalId:'sig-ms-copilot', tenantId:'demo-sandbox-tenant', vendor:'MICROSOFT', sourceType:'WEB_PAGE', sourceUrl:'https://www.microsoft.com/licensing/news', title:'Microsoft Copilot packaging update', rawText:'Copilot licensing terms and packaging update for enterprise seats.', detectedAt:'2026-05-30T08:00:00.000Z', hash:'demo-ms', signalState:'NORMALIZED' },
    { signalId:'sig-aws-sp', tenantId:'demo-sandbox-tenant', vendor:'AWS', sourceType:'RSS', sourceUrl:'https://aws.amazon.com/about-aws/whats-new/', title:'AWS Savings Plan discount update', rawText:'Savings plan discount update for compute commitments.', detectedAt:'2026-05-30T09:00:00.000Z', hash:'demo-aws', signalState:'NORMALIZED' },
    { signalId:'sig-snowflake', tenantId:'demo-sandbox-tenant', vendor:'SNOWFLAKE', sourceType:'DOC_PAGE', sourceUrl:'https://docs.snowflake.com/en/release-notes', title:'Snowflake credit optimization guidance', rawText:'Optimization guidance for warehouse credit consumption.', detectedAt:'2026-05-30T10:00:00.000Z', hash:'demo-snowflake', signalState:'NORMALIZED' },
    { signalId:'sig-adobe', tenantId:'demo-sandbox-tenant', vendor:'ADOBE', sourceType:'WEB_PAGE', sourceUrl:'https://helpx.adobe.com/enterprise', title:'Adobe license packaging change', rawText:'New bundle packaging change for Creative Cloud enterprise.', detectedAt:'2026-05-29T10:00:00.000Z', hash:'demo-adobe', signalState:'NORMALIZED' },
    { signalId:'sig-salesforce', tenantId:'demo-sandbox-tenant', vendor:'SALESFORCE', sourceType:'WEB_PAGE', sourceUrl:'https://help.salesforce.com/releases', title:'Salesforce SKU retirement', rawText:'SKU retirement and end of support notice for legacy plan.', detectedAt:'2026-05-29T11:00:00.000Z', hash:'demo-salesforce', signalState:'NORMALIZED' },
  ],
  changes: [
    { id: 'vc-microsoft-copilot-pricing', sourceSignalId:'sig-ms-copilot', vendor: 'MICROSOFT', category: 'LICENSING_CHANGE', classifierConfidence:'HIGH', classificationReasons:['licensing language detected'], title: 'Copilot Pricing Update', description: 'Packaging and pricing update creates reclaim and reallocation review.', effectiveDate: '2026-07-01', sourceUrl: 'https://www.microsoft.com/licensing/news', impactSeverity: 'HIGH', detectedAt: '2026-05-30T08:00:00.000Z', status: 'NEW', affectedSpend: 32000, generatedOpportunityCount: 6, potentialImpact: 28000, impactConfidence:'MEDIUM', impactReasons:['Microsoft tenant footprint matched to Copilot'] },
    { id: 'vc-aws-graviton-savings', sourceSignalId:'sig-aws-sp', vendor: 'AWS', category: 'COMMITMENT_CHANGE', classifierConfidence:'MEDIUM', classificationReasons:['commitment discount language detected'], title: 'AWS Savings Plan Discount Update', description: 'Savings Plan discount update for eligible compute.', effectiveDate: '2026-06-15', sourceUrl: 'https://aws.amazon.com/about-aws/whats-new/', impactSeverity: 'MEDIUM', detectedAt: '2026-05-30T09:00:00.000Z', status: 'ASSESSED', affectedSpend: 48000, generatedOpportunityCount: 4, potentialImpact: 6200, impactConfidence:'MEDIUM', impactReasons:['AWS tenant footprint matched to Savings Plans'] },
    { id: 'vc-snowflake-credit-guidance', sourceSignalId:'sig-snowflake', vendor: 'SNOWFLAKE', category: 'FEATURE_CHANGE', classifierConfidence:'LOW', classificationReasons:['feature/guidance language detected'], title: 'Warehouse Credit Optimization Guidance', description: 'Updated credit consumption guidance for bursty analytics workloads.', effectiveDate: '2026-06-05', sourceUrl: 'https://docs.snowflake.com/en/release-notes', impactSeverity: 'MEDIUM', detectedAt: '2026-05-30T10:00:00.000Z', status: 'ASSESSED', affectedSpend: 11000, generatedOpportunityCount: 2, potentialImpact: 1800, impactConfidence:'MEDIUM', impactReasons:['Snowflake contract/utilization records matched'] },
  ],
  impacts: { 'vc-microsoft-copilot-pricing': { affectedSpend: 32000, affectedPlatforms:['Microsoft 365','Copilot'], impactConfidence:'MEDIUM', impactReasons:['Microsoft Copilot records available'] } },
  opportunityPipeline: { 'vc-microsoft-copilot-pricing': { opportunities: [{ opportunityId:'opp-vc-ms-copilot', title:'Microsoft Copilot reclaim opportunity' }] } },
  pipelineHealth: { state:'HEALTHY', signalsIngested:5, duplicateSignals:0, changesClassified:5, highImpactChanges:3, opportunitiesPromoted:6, lastIngestionRun:'2026-05-30T10:00:00.000Z', classifierHealth:'HEALTHY' },
}

export const demoOpportunities = {
  summary: { openOpportunities: 32, projectedSavings: 184000, critical: 4, eligible: 18 },
  opportunities: [
    { id:'opp-copilot-reclaim', rank:1, source:'TRUST', title:'Copilot Reclaim', description:'Resolve stale usage evidence and reclaim inactive Copilot seats.', domain:'M365', projectedMonthlySavings:18000, trustScore:82, confidenceScore:86, urgency:'CRITICAL', readiness:'APPROVAL_REQUIRED', priorityBand:'CRITICAL', score:96, sourceReferenceId:'tf-copilot-stale-usage', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-aws-rightsizing', rank:2, source:'VENDOR_CHANGE', title:'AWS Rightsizing', description:'New Graviton savings opportunity for eligible compute.', domain:'AWS', projectedMonthlySavings:11000, trustScore:84, confidenceScore:82, urgency:'HIGH', readiness:'ELIGIBLE', priorityBand:'HIGH', score:88, sourceReferenceId:'vc-aws-graviton-savings', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-snowflake-auto-suspend', rank:3, source:'DRIFT', title:'Snowflake Auto Suspend', description:'Auto-suspend settings drifted from verified savings baseline.', domain:'SNOWFLAKE', projectedMonthlySavings:9200, trustScore:80, confidenceScore:79, urgency:'HIGH', readiness:'APPROVAL_REQUIRED', priorityBand:'HIGH', score:84, sourceReferenceId:'drift-snowflake-autosuspend', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-databricks-resize', rank:4, source:'UTILIZATION', title:'Databricks Warehouse Resize', description:'Warehouse utilization supports a smaller size.', domain:'DATABRICKS', projectedMonthlySavings:8200, trustScore:80, confidenceScore:81, urgency:'HIGH', readiness:'ELIGIBLE', priorityBand:'HIGH', score:82, sourceReferenceId:'util-databricks-warehouse', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-e5-rightsizing', rank:5, source:'TRUST', title:'E5 Rightsizing', description:'Unused E5 capabilities indicate downgrade candidates.', domain:'M365', projectedMonthlySavings:7600, trustScore:78, confidenceScore:80, urgency:'HIGH', readiness:'APPROVAL_REQUIRED', priorityBand:'HIGH', score:80, sourceReferenceId:'tf-e5-owner', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-servicenow-shelfware', rank:6, source:'TRUST', title:'ServiceNow Shelfware', description:'Unused ServiceNow fulfiller seats blocked by ownership gaps.', domain:'SERVICENOW', projectedMonthlySavings:6400, trustScore:61, confidenceScore:70, urgency:'HIGH', readiness:'BLOCKED', priorityBand:'MEDIUM', score:68, sourceReferenceId:'tf-servicenow-owner', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-openai-routing', rank:7, source:'UTILIZATION', title:'OpenAI Routing Optimization', description:'Route lower-risk AI runtime calls to lower-cost models.', domain:'AI_RUNTIME', projectedMonthlySavings:5800, trustScore:79, confidenceScore:76, urgency:'MEDIUM', readiness:'ELIGIBLE', priorityBand:'MEDIUM', score:66, sourceReferenceId:'util-openai-routing', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-azure-commit', rank:8, source:'UTILIZATION', title:'Azure Commit Coverage', description:'Uncovered Azure workloads are candidates for commitment review.', domain:'AZURE', projectedMonthlySavings:5100, trustScore:77, confidenceScore:75, urgency:'MEDIUM', readiness:'APPROVAL_REQUIRED', priorityBand:'MEDIUM', score:63, sourceReferenceId:'util-azure-commit', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-m365-owner-cleanup', rank:9, source:'TRUST', title:'M365 Owner Cleanup', description:'Missing cost centres block reclaim opportunities.', domain:'M365', projectedMonthlySavings:4300, trustScore:68, confidenceScore:72, urgency:'MEDIUM', readiness:'BLOCKED', priorityBand:'MEDIUM', score:58, sourceReferenceId:'tf-missing-owner', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-license-drift', rank:10, source:'DRIFT', title:'License Reassignment Drift', description:'Previously reclaimed licenses were reassigned.', domain:'M365', projectedMonthlySavings:3900, trustScore:74, confidenceScore:78, urgency:'MEDIUM', readiness:'APPROVAL_REQUIRED', priorityBand:'MEDIUM', score:56, sourceReferenceId:'drift-license-reassigned', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-salesforce-renewal', rank:11, source:'RENEWAL', title:'Salesforce Renewal True-up', description:'Renewal window exposes shelfware reduction opportunity.', domain:'SALESFORCE', projectedMonthlySavings:3400, trustScore:72, confidenceScore:70, urgency:'MEDIUM', readiness:'MANUAL_ONLY', priorityBand:'MEDIUM', score:52, sourceReferenceId:'renewal-salesforce', createdAt:'2026-05-30T12:00:00.000Z' },
    { id:'opp-adobe-contract', rank:12, source:'CONTRACT', title:'Adobe Contract Consolidation', description:'Contract terms and retired SKUs support consolidation review.', domain:'M365', projectedMonthlySavings:2400, trustScore:75, confidenceScore:74, urgency:'LOW', readiness:'MANUAL_ONLY', priorityBand:'LOW', score:44, sourceReferenceId:'contract-adobe', createdAt:'2026-05-30T12:00:00.000Z' },
  ],
}

export const demoRenewalIntelligence = {
  summary: { upcomingRenewals: 7, renewalSpend: 2400000, recoverable: 184000, highRisk: 2 },
  renewals: [
    { id:'ren-microsoft-e5', vendor:'MICROSOFT', contractName:'Microsoft E5', renewalDate:'2026-08-25', annualSpend:420000, renewalRisk:'HIGH', daysRemaining:87, readiness:{ renewalId:'ren-microsoft-e5', readinessScore:72, wasteIdentified:80287, recoverableSpend:68040, projectedSavings:68040, recommendedActions:7, negotiationLeverage:'HIGH' } },
    { id:'ren-aws-edp', vendor:'AWS', contractName:'AWS Enterprise Discount Program', renewalDate:'2026-09-27', annualSpend:850000, renewalRisk:'MEDIUM', daysRemaining:120, readiness:{ renewalId:'ren-aws-edp', readinessScore:76, wasteIdentified:90270, recoverableSpend:76500, projectedSavings:76500, recommendedActions:8, negotiationLeverage:'MEDIUM' } },
    { id:'ren-snowflake', vendor:'SNOWFLAKE', contractName:'Snowflake', renewalDate:'2026-07-11', annualSpend:180000, renewalRisk:'HIGH', daysRemaining:42, readiness:{ renewalId:'ren-snowflake', readinessScore:78, wasteIdentified:16567, recoverableSpend:14040, projectedSavings:14040, recommendedActions:3, negotiationLeverage:'HIGH' } },
    { id:'ren-servicenow', vendor:'SERVICENOW', contractName:'ServiceNow', renewalDate:'2026-08-01', annualSpend:320000, renewalRisk:'MEDIUM', daysRemaining:63, readiness:{ renewalId:'ren-servicenow', readinessScore:82, wasteIdentified:41536, recoverableSpend:35200, projectedSavings:35200, recommendedActions:4, negotiationLeverage:'MEDIUM' } },
    { id:'ren-salesforce', vendor:'SALESFORCE', contractName:'Salesforce Sales Cloud', renewalDate:'2026-10-15', annualSpend:260000, renewalRisk:'LOW', daysRemaining:138, readiness:{ renewalId:'ren-salesforce', readinessScore:78, wasteIdentified:21476, recoverableSpend:18200, projectedSavings:18200, recommendedActions:3, negotiationLeverage:'LOW' } },
    { id:'ren-adobe', vendor:'ADOBE', contractName:'Adobe Enterprise', renewalDate:'2026-11-01', annualSpend:140000, renewalRisk:'LOW', daysRemaining:155, readiness:{ renewalId:'ren-adobe', readinessScore:78, wasteIdentified:9912, recoverableSpend:8400, projectedSavings:8400, recommendedActions:3, negotiationLeverage:'LOW' } },
    { id:'ren-databricks', vendor:'DATABRICKS', contractName:'Databricks Platform', renewalDate:'2026-12-18', annualSpend:230000, renewalRisk:'MEDIUM', daysRemaining:202, readiness:{ renewalId:'ren-databricks', readinessScore:70, wasteIdentified:23069, recoverableSpend:19550, projectedSavings:19550, recommendedActions:3, negotiationLeverage:'MEDIUM' } },
  ],
}

export const demoBenchmarkIntelligence = {
  summary: { benchmarksEvaluated: 24, highImpactGaps: 6, recoverableValue: 114000, generatedOpportunities: 12 },
  benchmarks: [
    { id:'bm-copilot-adoption', category:'COPILOT_ADOPTION', tenantValue:18, benchmarkValue:42, variancePercent:-24, impactLevel:'HIGH', createdAt:'2026-05-30T12:00:00.000Z', opportunity:'Copilot Utilization Campaign', recoverableValue:21600 },
    { id:'bm-e5-utilization', category:'M365_UTILIZATION', tenantValue:31, benchmarkValue:54, variancePercent:-23, impactLevel:'HIGH', createdAt:'2026-05-30T12:00:00.000Z', opportunity:'M365 Rightsizing Opportunity', recoverableValue:20700 },
    { id:'bm-snowflake-efficiency', category:'SNOWFLAKE_EFFICIENCY', tenantValue:61, benchmarkValue:78, variancePercent:-17, impactLevel:'HIGH', createdAt:'2026-05-30T12:00:00.000Z', opportunity:'Snowflake Efficiency Opportunity', recoverableValue:15300 },
    { id:'bm-aws-efficiency', category:'AWS_EFFICIENCY', tenantValue:73, benchmarkValue:84, variancePercent:-11, impactLevel:'MEDIUM', createdAt:'2026-05-30T12:00:00.000Z', opportunity:'AWS Efficiency Opportunity', recoverableValue:5720 },
    { id:'bm-ai-runtime-efficiency', category:'AI_RUNTIME_EFFICIENCY', tenantValue:64, benchmarkValue:81, variancePercent:-17, impactLevel:'HIGH', createdAt:'2026-05-30T12:00:00.000Z', opportunity:'AI Runtime Cost Efficiency Opportunity', recoverableValue:15300 },
  ],
  opportunities: [
    { id:'opp-benchmark-copilot-adoption', source:'BENCHMARK', title:'Copilot Utilization Campaign', projectedMonthlySavings:1800, domain:'M365' },
    { id:'opp-benchmark-e5-utilization', source:'BENCHMARK', title:'M365 Rightsizing Opportunity', projectedMonthlySavings:1725, domain:'M365' },
    { id:'opp-benchmark-snowflake-efficiency', source:'BENCHMARK', title:'Snowflake Efficiency Opportunity', projectedMonthlySavings:1275, domain:'SNOWFLAKE' },
  ],
}

export const demoContractIntelligence = {
  summary: { contracts: 18, atRisk: 4, unusedValue: 240000, generatedOpportunities: 16 },
  contracts: [
    { id:'con-microsoft-ea', vendor:'MICROSOFT', contractName:'Microsoft Enterprise Agreement', startDate:'2024-09-01', endDate:'2026-08-31', annualValue:420000, autoRenew:true, commitmentValue:390000, unusedValue:68000, riskLevel:'HIGH', intelligence:{ unusedSpend:68000, commitmentExposure:38000, renewalRisk:'HIGH', priceIncreaseExposure:33600, autoRenewalExposure:63000, trueUpExposure:2400 } },
    { id:'con-aws-edp', vendor:'AWS', contractName:'AWS EDP', startDate:'2024-10-01', endDate:'2026-09-30', annualValue:850000, autoRenew:false, commitmentValue:780000, unusedValue:104000, riskLevel:'HIGH', intelligence:{ unusedSpend:104000, commitmentExposure:34000, renewalRisk:'HIGH', priceIncreaseExposure:68000, autoRenewalExposure:0, trueUpExposure:5600 } },
    { id:'con-snowflake', vendor:'SNOWFLAKE', contractName:'Snowflake Commitment', startDate:'2025-01-01', endDate:'2026-12-31', annualValue:180000, autoRenew:true, commitmentValue:160000, unusedValue:22000, riskLevel:'HIGH', intelligence:{ unusedSpend:22000, commitmentExposure:2000, renewalRisk:'HIGH', priceIncreaseExposure:14400, autoRenewalExposure:27000, trueUpExposure:1600 } },
    { id:'con-adobe', vendor:'ADOBE', contractName:'Adobe Enterprise', startDate:'2025-02-01', endDate:'2027-01-31', annualValue:96000, autoRenew:true, commitmentValue:90000, unusedValue:11000, riskLevel:'HIGH', intelligence:{ unusedSpend:11000, commitmentExposure:5000, renewalRisk:'HIGH', priceIncreaseExposure:7680, autoRenewalExposure:14400, trueUpExposure:480 } },
  ],
  opportunities: [
    { id:'opp-contract-snowflake', source:'CONTRACT', title:'Commitment Optimization Opportunity', projectedMonthlySavings:1833, domain:'SNOWFLAKE' },
    { id:'opp-contract-microsoft', source:'CONTRACT', title:'Renewal Readiness Opportunity', projectedMonthlySavings:5250, domain:'M365' },
    { id:'opp-contract-adobe', source:'CONTRACT', title:'License Reclaim Opportunity', projectedMonthlySavings:917, domain:'M365' },
  ],
}

export const demoExecutivePriorities = [
  { priorityId:'prio-copilot-inactive', tenantId:'demo', opportunityId:'opp-copilot-inactive', title:'Inactive Copilot Licences', source:'TRUST', domain:'M365', projectedMonthlySavings:18000, projectedAnnualSavings:216000, trustScore:88, confidenceScore:91, readiness:'ELIGIBLE', riskLevel:'LOW', executionEase:'EASY', timeToRealize:'IMMEDIATE', strategicImportance:'HIGH', executiveScore:94, priorityBand:'CRITICAL', priorityRank:1, rationale:['High projected monthly savings','Ready for execution','Fast time-to-realize'], recommendedNextAction:'Move to execution queue', createdAt:'2026-05-30T12:00:00.000Z' },
  { priorityId:'prio-snowflake-auto-suspend', tenantId:'demo', opportunityId:'opp-snowflake-auto-suspend', title:'Snowflake Auto Suspend', source:'VENDOR_CHANGE', domain:'SNOWFLAKE', projectedMonthlySavings:9200, projectedAnnualSavings:110400, trustScore:84, confidenceScore:88, readiness:'ELIGIBLE', riskLevel:'LOW', executionEase:'EASY', timeToRealize:'SHORT', strategicImportance:'HIGH', executiveScore:88, priorityBand:'CRITICAL', priorityRank:2, rationale:['Ready for execution','Fast time-to-realize','Strategically important opportunity source'], recommendedNextAction:'Move to execution queue', createdAt:'2026-05-30T12:00:00.000Z' },
  { priorityId:'prio-aws-rightsizing', tenantId:'demo', opportunityId:'opp-aws-rightsizing', title:'AWS Rightsizing Wave', source:'VENDOR_CHANGE', domain:'AWS', projectedMonthlySavings:11000, projectedAnnualSavings:132000, trustScore:82, confidenceScore:76, readiness:'APPROVAL_REQUIRED', riskLevel:'MEDIUM', executionEase:'MODERATE', timeToRealize:'SHORT', strategicImportance:'HIGH', executiveScore:82, priorityBand:'HIGH', priorityRank:3, rationale:['Approval required but high value','Fast time-to-realize'], recommendedNextAction:'Submit for approval', createdAt:'2026-05-30T12:00:00.000Z' },
  { priorityId:'prio-microsoft-renewal-cleanup', tenantId:'demo', opportunityId:'opp-microsoft-renewal-cleanup', title:'Microsoft Renewal Cleanup', source:'RENEWAL', domain:'M365', projectedMonthlySavings:5667, projectedAnnualSavings:68000, trustScore:86, confidenceScore:89, readiness:'APPROVAL_REQUIRED', riskLevel:'MEDIUM', executionEase:'MODERATE', timeToRealize:'MEDIUM', strategicImportance:'HIGH', executiveScore:78, priorityBand:'HIGH', priorityRank:4, rationale:['Approval required but high value','Strategically important renewal window'], recommendedNextAction:'Submit for approval', createdAt:'2026-05-30T12:00:00.000Z' },
  { priorityId:'prio-servicenow-shelfware', tenantId:'demo', opportunityId:'opp-servicenow-shelfware', title:'ServiceNow Shelfware', source:'TRUST', domain:'SERVICENOW', projectedMonthlySavings:7000, projectedAnnualSavings:84000, trustScore:61, confidenceScore:70, readiness:'BLOCKED', riskLevel:'HIGH', executionEase:'MODERATE', timeToRealize:'MEDIUM', strategicImportance:'MEDIUM', executiveScore:52, priorityBand:'MEDIUM', priorityRank:5, rationale:['Blocked by readiness constraints','Scoring dimensions estimated from opportunity source'], recommendedNextAction:'Resolve trust blockers', createdAt:'2026-05-30T12:00:00.000Z' },
]

export const demoExecutivePrioritySummary = { tenantId:'demo', totalOpportunities:32, topFiveMonthlySavings:67000, topFiveAnnualSavings:804000, readyNowCount:2, approvalRequiredCount:2, blockedCount:1, averageTrustScore:82, confidenceBand:'HIGH', executionReadinessPercent:82, topOpportunityTitle:'Inactive Copilot Licences', topOpportunityValue:18000, summaryNarrative:'If you execute the top 5 opportunities, Certen estimates $67,000/month potential savings with HIGH confidence. 2 of the top 5 are ready now; 2 require approval.', generatedAt:'2026-05-30T12:00:00.000Z' }

export const demoUtilizationIntelligence = {
  summary: { assetsAnalysed: 4200, unusedValue: 164000, lowUtilization: 184, generatedOpportunities: 46 },
  records: [
    { id:'util-copilot', platform:'COPILOT', resourceName:'Copilot', assignedCount:320, activeCount:84, utilizationPercent:26, monthlyCost:21000, wasteEstimate:15000, utilizationBand:'MEDIUM', lastActivityAt:'2026-05-29T10:00:00.000Z', opportunity:'Generate Campaign' },
    { id:'util-m365-e5', platform:'M365', resourceName:'Microsoft 365 E5', assignedCount:860, activeCount:310, utilizationPercent:36, monthlyCost:49200, wasteEstimate:31500, utilizationBand:'MEDIUM', lastActivityAt:'2026-05-28T10:00:00.000Z', opportunity:'Rightsizing Opportunity' },
    { id:'util-snowflake', platform:'SNOWFLAKE', resourceName:'Snowflake XL Warehouse', assignedCount:12, activeCount:2, utilizationPercent:17, monthlyCost:18000, wasteEstimate:15000, utilizationBand:'LOW', lastActivityAt:'2026-05-20T10:00:00.000Z', opportunity:'Warehouse Optimization Opportunity' },
    { id:'util-salesforce', platform:'SALESFORCE', resourceName:'Sales Cloud Enterprise', assignedCount:540, activeCount:260, utilizationPercent:48, monthlyCost:37800, wasteEstimate:19600, utilizationBand:'MEDIUM', lastActivityAt:'2026-05-27T10:00:00.000Z', opportunity:'License Reclaim Opportunity' },
    { id:'util-adobe', platform:'ADOBE', resourceName:'Adobe Creative Cloud', assignedCount:220, activeCount:0, utilizationPercent:0, monthlyCost:15400, wasteEstimate:15400, utilizationBand:'UNUSED', lastActivityAt:'2026-04-30T10:00:00.000Z', opportunity:'License Reclaim Opportunity' },
  ],
  opportunities: [
    { id:'opp-util-copilot', source:'UTILIZATION', title:'Copilot Reclaim Opportunity', projectedMonthlySavings:15000, domain:'M365' },
    { id:'opp-util-snowflake', source:'UTILIZATION', title:'Warehouse Optimization Opportunity', projectedMonthlySavings:15000, domain:'SNOWFLAKE' },
    { id:'opp-util-salesforce', source:'UTILIZATION', title:'License Reclaim Opportunity', projectedMonthlySavings:19600, domain:'SALESFORCE' },
  ],
}
