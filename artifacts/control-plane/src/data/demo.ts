export const demoWorkspace = { mode: 'demo' as const, tenantId: 'demo-sandbox-tenant', tenantName: 'Demo workspace', dataReady: true }
export const demoCommandMetrics = { totalIdentified: 25000, eligibleNow: 11000, pendingApproval: 7000, blockedManual: 2000 }
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

export const demoOutcomes = { stats:[24800,4200,-20600,2,0,1], ledger:[
  {id:'o1', action:'OpenAI route policy update', projected:11200, verified:4200, evidence:'Evidence-backed', state:'Verified'},
  {id:'o2', action:'Snowflake auto-suspend', projected:9240, verified:null, evidence:'Evidence-backed', state:'Pending'},
  {id:'o3', action:'M365 Wave 1 licence reclaim', projected:14280, verified:8400, evidence:'Evidence-backed', state:'Verified'},
  {id:'o4', action:'Model downgrade GPT-4 → 3.5', projected:1240, verified:null, evidence:'—', state:'Pending'},
  {id:'o5', action:'Zoom consolidation — Q2', projected:3100, verified:null, evidence:'—', state:'Pending'},
]}

export const demoDrift = [
  {id:'d1', title:'License reclaim recurrence watch', status:'Active', risk:'Medium', atRisk:900},
  {id:'d2', title:'Snowflake warehouse resize drift', status:'Active', risk:'Low', atRisk:240},
  {id:'d3', title:'AWS rightsizing reversion risk', status:'Warning', risk:'Medium', atRisk:1400},
  {id:'d4', title:'Copilot licence reassignment', status:'Resolved', risk:'Low', atRisk:0},
]

export const demoIntelligence = { funnel:{ identified:76000, eligible:53320, pending:22440, realised:11730 } }
