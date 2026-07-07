import test from 'node:test'
import assert from 'node:assert/strict'
import { demoTechnologyPortfolioSummary, emptyTechnologyPortfolioSummary } from '../hooks/useTechnologyPortfolio'
import { renderTechnologyPortfolioState } from '../pages/TechnologyPortfolio'

test('Technology Management UI model renders demo, KPIs, risks and recommendations', () => {
  const s = demoTechnologyPortfolioSummary()
  const r = renderTechnologyPortfolioState(s, true)
  assert.equal(r.demoBanner, 'Demo technology management data')
  assert.ok(r.assetRows > 0)
  assert.ok(r.riskCount > 0)
  assert.ok(r.recommendationCount > 0)
  assert.match(r.rationalisationOpportunity, /\$/)
})

test('Technology Management UI model live empty state uses unavailable and no demo values', () => {
  const r = renderTechnologyPortfolioState(emptyTechnologyPortfolioSummary, false)
  assert.equal(r.demoBanner, '')
  assert.equal(r.empty, true)
  assert.equal(r.governedAssets, 0)
  assert.equal(r.unknown, 'Not available')
})

test('Pilot Workspace includes portfolio readiness contract', () => {
  const demo = demoTechnologyPortfolioSummary()
  assert.equal(demo.snapshot?.readiness, 'DEMO')
})
