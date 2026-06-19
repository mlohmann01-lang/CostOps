import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoStory } from './demoStory'
const read = (path:string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('executive shared components render enterprise UI primitives', () => {
  for (const file of ['ExecutivePageShell.tsx','ExecutiveKpiCard.tsx','ExecutiveSection.tsx','RiskBadge.tsx','StatusBadge.tsx','EvidenceBadge.tsx','EmptyState.tsx','WorkspaceModeBanner.tsx','DemoModeBanner.tsx','ExecutiveBarChart.tsx','ExecutiveDonutChart.tsx']) {
    const source = read(`../components/executive/${file}`)
    assert.equal(source.length > 100, true)
  }
  assert.equal(read('../components/executive/WorkspaceModeBanner.tsx').includes('Workspace Mode'), true)
  assert.equal(read('../components/executive/WorkspaceModeBanner.tsx').includes('Data Source'), true)
  assert.equal(read('../components/executive/WorkspaceModeBanner.tsx').includes('Execution Mode'), true)
})

test('demo storytelling narratives are available for polished pages', () => {
  assert.equal(demoStory.platformNarrative.includes('Technology Governance & Outcome Control Platform'), true)
  assert.equal(demoStory.executiveRiskNarrative.includes('Executive Risk Command Center'), true)
  assert.equal(demoStory.governanceGraphNarrative.includes('Governance Graph connects vendors'), true)
  assert.equal(demoStory.pilotWorkspaceNarrative.includes('demo, pilot and production modes'), true)
  assert.equal(demoStory.productionNarrative.includes('production operation'), true)
})

test('sidebar keeps enterprise navigation groups and key routes', () => {
  const sidebar = read('../components/layout/Sidebar.tsx')
  for (const snippet of ['Auto Execution', 'Value Realisation', 'Protected Governance', 'Platform', 'Executive Risk', 'Overview', 'Technology Portfolio', 'Governance', 'Evidence']) assert.equal(sidebar.includes(snippet), true)
})
