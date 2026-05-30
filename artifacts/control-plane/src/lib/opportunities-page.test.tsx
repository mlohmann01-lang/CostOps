import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { demoOpportunities } from '../data/demo'
import { opportunityApiPaths } from '../hooks/useOpportunitiesData'

test('demo mode has 12 mixed canonical opportunities', () => {
  assert.equal(demoOpportunities.opportunities.length, 12)
  assert.equal(demoOpportunities.summary.openOpportunities, 32)
  for (const source of ['TRUST', 'VENDOR_CHANGE', 'DRIFT', 'UTILIZATION']) assert.ok(demoOpportunities.opportunities.some((opp: any) => opp.source === source))
  assert.ok(demoOpportunities.opportunities.some((opp: any) => opp.title.includes('Copilot')))
  assert.ok(demoOpportunities.opportunities.some((opp: any) => opp.title.includes('AWS')))
  assert.ok(demoOpportunities.opportunities.some((opp: any) => opp.title.includes('Snowflake')))
  assert.ok(demoOpportunities.opportunities.some((opp: any) => opp.title.includes('OpenAI')))
})

test('Opportunities page visible in route and sidebar', () => {
  const app = fs.readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
  const sidebar = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  assert.equal(app.includes('/opportunities'), true)
  assert.equal(sidebar.includes('Opportunities'), true)
  assert.equal(sidebar.includes('OPERATIONAL'), true)
})

test('Opportunities page renders cards, table, priority and readiness columns', () => {
  const page = fs.readFileSync(new URL('../pages/OpportunitiesView.tsx', import.meta.url), 'utf8')
  for (const text of ['Open Opportunities', 'Projected Savings', 'Critical', 'Eligible', 'Source', 'Domain', 'Priority', 'Readiness']) assert.equal(page.includes(text), true)
  assert.equal(page.includes('opportunities-table'), true)
})

test('live API wiring calls opportunities APIs without demo fallback', () => {
  const hook = fs.readFileSync(new URL('../hooks/useOpportunitiesData.ts', import.meta.url), 'utf8')
  assert.deepEqual(opportunityApiPaths, ['/api/opportunities', '/api/opportunities/top'])
  assert.equal(hook.includes("liveFetch<any>('/api/opportunities')"), true)
  assert.equal(hook.includes("liveFetch<any>('/api/opportunities/top')"), true)
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  assert.equal(hook.includes('catch (err)'), true)
})

test('Command integration shows top opportunities', () => {
  const command = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  assert.equal(command.includes('Top Opportunities'), true)
  assert.equal(command.includes('top-opportunities'), true)
  assert.equal(command.includes('/opportunities'), true)
})
