import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

// MW-004 — Terminology Consistency Pass.
// These assertions are static/source-based, following the convention already used by
// app-shell-routes.test.ts and tenant-readiness-consistency.test.ts in this repo: they
// scan the rendered source of each target page for the canonical empty/pending-state
// copy adopted in this sprint, so any future regression that reintroduces an
// inconsistent variant (e.g. "No technology data yet", "Opportunities appear after
// analysis", "Not available") will fail loudly here.

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Technology Authority page uses canonical "No data available yet." for state A', () => {
  const page = read('../pages/TechnologyPortfolio.tsx')
  assert.equal(page.includes('No data available yet.'), true)
  assert.equal(page.includes('Connect a source to begin discovery.'), true)
  assert.equal(page.includes('No technology data yet'), false)
})

test('Technology Authority page uses canonical "Available after analysis." for state B', () => {
  const page = read('../pages/TechnologyPortfolio.tsx')
  assert.equal(page.includes('Available after analysis.'), true)
  assert.equal(page.includes('Opportunities appear after analysis.'), false)
})

test('Outcome Finance page uses canonical "Awaiting finance reconciliation." for state D', () => {
  const page = read('../pages/executive/OutcomeFinance.tsx')
  assert.equal(page.includes('Awaiting finance reconciliation.'), true)
})

test('Authority Catalog page keeps canonical "Available after discovery." for state F unchanged', () => {
  const page = read('../pages/intelligence/AuthorityCatalog.tsx')
  assert.equal(page.includes('Available after discovery'), true)
})

test('Economic Control Chain stage data keeps canonical "Protection begins after verified outcomes exist." for state E unchanged', () => {
  const chain = read('../lib/economicControlChain/defaultEconomicControlChain.ts')
  assert.equal(chain.includes('Protection begins after verified outcomes exist.'), true)
})

test('Economic Control Chain page renders the stage-level unavailableMessage copy, including the state E canonical phrase', () => {
  const page = read('../pages/intelligence/EconomicControlChain.tsx')
  assert.equal(page.includes('stage.unavailableMessage'), true)
})

test('Economic Control Chain page uses canonical "No data available yet." for state A instead of "Not available"', () => {
  const page = read('../pages/intelligence/EconomicControlChain.tsx')
  assert.equal(page.includes('No data available yet.'), true)
  assert.equal(page.includes("'Not available'"), false)
})
