import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { aiIntelligenceApiPaths, demoAIIntelligenceData, normalizeAIIntelligencePayload } from '../hooks/useAIIntelligenceData'

test('Technology Portfolio includes AI Assets tabs and row fields', () => {
  const page = fs.readFileSync(new URL('../pages/IntelligenceView.tsx', import.meta.url), 'utf8')
  for (const text of ['AI Assets', 'All AI Assets', 'Models', 'Agents', 'MCP Servers', 'Workflows', 'Tools', 'Vendors', 'Governance Flags', 'Name', 'Type', 'Vendor', 'Owner', 'Department', 'Status', 'Approval', 'Last Seen']) assert.equal(page.includes(text), true)
})

test('AI utilisation and spend dashboard labels are present', () => {
  const page = fs.readFileSync(new URL('../pages/IntelligenceView.tsx', import.meta.url), 'utf8')
  for (const text of ['Total AI Assets', 'Active AI Assets', 'Inactive AI Assets', 'Unused AI Assets', 'Usage By Type', 'Usage By Vendor', 'Usage By Department', 'Highest Used Assets', 'Dormant Assets', 'Total AI Spend', 'Spend By Vendor', 'Spend By Model', 'Spend By Agent', 'Spend By Workflow', 'Spend By Department', 'Spend By Cost Centre', 'Monthly Trend', 'High Spend / Low Usage Assets']) assert.equal(page.includes(text), true)
})

test('AI intelligence hook wires required tenant-scoped API paths', () => {
  assert.deepEqual([...aiIntelligenceApiPaths], ['/api/ai/connectors', '/api/ai/assets', '/api/ai/utilisation', '/api/ai/spend', '/api/ai/governance/findings', '/api/ai/recommendations', '/api/ai/dashboard', '/api/ai/command-dashboard', '/api/ai/executive-proof-pack'])
  const normalized = normalizeAIIntelligencePayload({})
  assert.equal(normalized.assets.length, demoAIIntelligenceData.assets.length)
  assert.ok(JSON.stringify(normalized).includes('ASSIGN_AI_OWNER'))
})


test('AI Economic Command Dashboard renders executive metrics detail page playbooks and proof pack', () => {
  const page = fs.readFileSync(new URL('../pages/AIEconomicCommandDashboard.tsx', import.meta.url), 'utf8')
  for (const text of ['AI Economic Command Dashboard', 'Approved vs Unapproved', 'Owned vs Unowned', 'Active vs Inactive', 'Total AI Spend', 'High-Cost / Low-Usage Assets', 'Top AI Optimisation Recommendations', 'Evidence-Ready Savings Opportunities', 'AI Recommendation Detail Page', 'Finding', 'Evidence', 'Affected Asset', 'Owner', 'Expected Saving', 'Action Path', 'Governance Status', 'Ledger History', 'AI Optimisation Playbooks v1', 'Assign owner', 'Review unapproved AI asset', 'Retire inactive AI asset', 'Review high-cost / low-usage asset', 'Consolidate duplicate AI capability', 'AI Executive Proof Pack', 'AI Estate Summary', 'Spend Exposure', 'Governance Gaps', 'Optimisation Opportunities', 'Actions Taken', 'AI Connector & Discovery Framework', 'OpenAI', 'Anthropic', 'GitHub Copilot', 'Microsoft Copilot', 'Cursor', 'Claude Teams', 'Gemini Enterprise', 'Azure OpenAI', 'Custom MCP Registries']) assert.equal(page.includes(text), true)
})

test('AI Economic Command Dashboard route is wired', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes("import AIEconomicCommandDashboard from './pages/AIEconomicCommandDashboard'"), true)
  assert.equal(app.includes('/ai-economic-command'), true)
})
