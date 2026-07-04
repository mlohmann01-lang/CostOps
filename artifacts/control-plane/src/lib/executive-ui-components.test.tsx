import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoStory } from './demoStory'
const read = (path:string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('executive shared components render enterprise UI primitives', () => {
  for (const file of ['ExecutivePageShell.tsx','ExecutiveKpiCard.tsx','ExecutiveSection.tsx','RiskBadge.tsx','StatusBadge.tsx','EvidenceBadge.tsx','EmptyState.tsx','WorkspaceModeBanner.tsx','DemoModeBanner.tsx','ExecutiveBarChart.tsx','ExecutiveDonutChart.tsx','ExecutivePrimitives.tsx']) {
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
  for (const snippet of ['Command', 'Executive', 'Intelligence', 'Operations', 'Admin', 'Risk', 'Overview', 'Technology Portfolio', 'Governance', 'Evidence']) assert.equal(sidebar.includes(snippet), true)
})

import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConfidenceBadge, ExecutiveEvidenceBadge, ExecutiveMetricStrip, ExecutiveNarrative, LiveStateBanner, StatusChip, Timeline, TimelineEvent } from '../components/executive'

test('converged executive primitives render labels values and honest empty live state messaging', () => {
  const html = renderToStaticMarkup(<div>
    <ExecutiveMetricStrip metrics={[{ label: 'Projected Annual Value', value: '$42k', hero: true }, { label: 'Blocked', value: '2 Blocked' }]} />
    <ExecutiveNarrative title='What to care about today'>No synthetic live values are shown.</ExecutiveNarrative>
    <LiveStateBanner title='LIVE_UNCONNECTED' description='Connect a tenant before live values, charts, findings, or trust scores are displayed.' />
  </div>)
  assert.match(html, /Projected Annual Value/)
  assert.match(html, /\$42k/)
  assert.match(html, /What to care about today/)
  assert.match(html, /Connect a tenant before live values/)
})

test('status evidence confidence and timeline primitives render consistent accessible copy', () => {
  const html = renderToStaticMarkup(<div>
    <StatusChip label='Blocked' tone='danger' />
    <ExecutiveEvidenceBadge label='Evidence' count={3} />
    <ExecutiveEvidenceBadge label='Evidence' state='Unavailable' />
    <ConfidenceBadge value={87} />
    <ConfidenceBadge value={null} />
    <Timeline title='Lifecycle timeline'><TimelineEvent title='Verified' timestamp='2026-07-04' detail='Outcome Proof Authority' /></Timeline>
  </div>)
  assert.match(html, /Blocked/)
  assert.match(html, /Evidence: 3 items/)
  assert.match(html, /Evidence: Unavailable/)
  assert.match(html, /Confidence: 87%/)
  assert.match(html, /Confidence: Unavailable/)
  assert.match(html, /Lifecycle timeline/)
  assert.match(html, /Outcome Proof Authority/)
})

test('no new hidden test string blocks were introduced by executive convergence', () => {
  const changedFiles = ['../components/executive/ExecutivePrimitives.tsx', '../pages/CommandView.tsx', '../pages/OutcomeLedgerView.tsx']
  for (const file of changedFiles) {
    const source = read(file)
    assert.equal(source.includes('display:none'), false)
    assert.equal(source.includes('className="hidden"'), false)
    assert.equal(source.includes('test-only'), false)
  }
})
