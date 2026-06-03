import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoAIGovernanceExposureData, normalizeAIGovernanceExposurePayload } from '../hooks/useAIGovernanceExposureData'
import { NAV_GROUPS } from '../components/layout/Sidebar'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('AI Governance page renders header and KPI row', () => {
  const page = read('../pages/AIGovernanceExposure.tsx')
  for (const snippet of ['AI Governance', 'Discover AI applications, policy gaps, data exposure risks, source code exposure risks, duplicate AI tooling, and AI spend governance.', 'Read-only intelligence', 'Workspace Mode', 'Sample governance dataset', 'AI Applications Detected', 'Unapproved AI Apps', 'Policy Gaps', 'Governance Exposure Score', 'Potential Annual Savings', 'High-Risk Findings']) assert.equal(page.includes(snippet), true)
  assert.equal(page.includes("data-testid='ai-governance-kpis'"), true)
})

test('AI Governance demo data renders required AI tools', () => {
  const text = JSON.stringify(demoAIGovernanceExposureData)
  for (const app of ['ChatGPT', 'Claude', 'Microsoft Copilot', 'GitHub Copilot', 'Cursor', 'Perplexity', 'Gemini']) assert.equal(text.includes(app), true)
})

test('AI Governance sections render inventory findings exposure duplicate policy actions and evidence', () => {
  const page = read('../pages/AIGovernanceExposure.tsx')
  for (const snippet of ['AI Application Inventory', 'AI Governance Findings', 'Data & Code Exposure Risks', 'Data Exposure', 'Source Code Exposure', 'Duplicate AI Tooling', 'Policy Coverage', 'Governance Actions', 'Assign owner', 'Review approval status', 'Apply AI policy', 'Consolidate AI tooling', 'Review code-upload controls', 'Review data-sharing controls', 'Evidence Panel']) assert.equal(page.includes(snippet), true)
})

test('AI Governance survives missing API/live data', () => {
  const data = normalizeAIGovernanceExposurePayload({})
  assert.equal(data.summary.aiApplicationsDetected, demoAIGovernanceExposureData.summary.aiApplicationsDetected)
  assert.equal(data.findings.length, 0)
  assert.equal(data.inventory.length, 0)
})

test('AI Governance savings render only supported findings', () => {
  assert.equal(demoAIGovernanceExposureData.findings.filter((finding) => finding.findingType === 'AI_OWNER_GAP' || finding.findingType === 'DATA_EXPOSURE_RISK' || finding.findingType === 'SOURCE_CODE_EXPOSURE_RISK').every((finding) => finding.potentialAnnualSavings === undefined), true)
  assert.equal(demoAIGovernanceExposureData.findings.some((finding) => Number(finding.potentialAnnualSavings) > 0), true)
})

test('AI Governance route and sidebar link are wired', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes("import AIGovernanceExposure from './pages/AIGovernanceExposure'"), true)
  assert.equal(app.includes('/ai-governance'), true)
  const labels = NAV_GROUPS.flatMap((group) => group.items.map((item) => `${item.label}:${item.href}`)).join(' | ')
  assert.match(labels, /AI Governance:\/ai-governance/)
})
