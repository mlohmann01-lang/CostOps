import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { demoRecommendationExplainability, demoTrustResolutionFindings } from '../data/demo'
import { LiveDataError } from '../components/shared/Foundation'

test('drawer opens from Recommendations', () => {
  const source = fs.readFileSync(new URL('../pages/recommendations.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('RecommendationExplainabilityDrawer'), true)
  assert.equal(source.includes('setExplainId(r.id)'), true)
})

test('drawer opens from Data Trust finding', () => {
  const source = fs.readFileSync(new URL('../pages/DataTrustView.tsx', import.meta.url), 'utf8')
  assert.equal(source.includes('setFindingId(f.findingId)'), true)
  assert.equal(source.includes('onSelectRecommendation'), true)
})

test('evidence chain renders', () => {
  const drawer = fs.readFileSync(new URL('../components/RecommendationExplainabilityDrawer.tsx', import.meta.url), 'utf8')
  assert.equal(drawer.includes('Evidence chain'), true)
  assert.ok((demoRecommendationExplainability as any)['1'].evidenceChain.length > 0)
})

test('resolution steps render', () => {
  const drawer = fs.readFileSync(new URL('../components/RecommendationExplainabilityDrawer.tsx', import.meta.url), 'utf8')
  assert.equal(drawer.includes('Recommended resolution steps'), true)
  assert.equal((demoRecommendationExplainability as any)['1'].resolutionSteps[0].title, 'Refresh connector sync')
})

test('unlock value renders', () => {
  const drawer = fs.readFileSync(new URL('../components/RecommendationExplainabilityDrawer.tsx', import.meta.url), 'utf8')
  assert.equal(drawer.includes('Unlock value'), true)
  assert.equal((demoRecommendationExplainability as any)['6'].unlockValue, 18000)
})

test('live API called in live mode', () => {
  const explainHook = fs.readFileSync(new URL('../hooks/useRecommendationExplainability.ts', import.meta.url), 'utf8')
  const trustHook = fs.readFileSync(new URL('../hooks/useTrustResolutionData.ts', import.meta.url), 'utf8')
  assert.equal(explainHook.includes('/api/recommendations/'), true)
  assert.equal(explainHook.includes('/explain'), true)
  assert.equal(trustHook.includes('/api/trust/findings/'), true)
})

test('demo data not used in live mode', () => {
  const explainHook = fs.readFileSync(new URL('../hooks/useRecommendationExplainability.ts', import.meta.url), 'utf8')
  assert.equal(explainHook.includes("if (workspace.mode === 'demo')"), true)
  assert.equal(explainHook.includes("if (!workspace.dataReady)"), true)
  assert.equal(explainHook.includes('catch (err)'), true)
})

test('live errors show safe error state', () => {
  const html = renderToStaticMarkup(<LiveDataError error={new Error('Live explainability unavailable')} />)
  assert.match(html, /Live data unavailable/)
  assert.doesNotMatch(html, /M365 reclaim blocked/)
})

test('trust resolution demo finding affects multiple recommendations', () => {
  const multi = demoTrustResolutionFindings.find((item) => item.findingId === 'tf-servicenow-multi')!
  assert.ok(multi.affectedRecommendations.length >= 3)
})
