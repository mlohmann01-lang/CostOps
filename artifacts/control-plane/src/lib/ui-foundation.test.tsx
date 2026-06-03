import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { WorkspaceReactContext, deriveWorkspace } from './workspaceContext'
import { shouldShowDemoBanner } from '../components/layout/DemoBanner'
import { NAV_GROUPS } from '../components/layout/Sidebar'
import { ActionButton, EmptyState, MetricCard, SectionLabel, StatusPill, TableRow } from '../components/shared/Foundation'

test('WorkspaceProvider exposes demo/live mode mapping', () => {
  assert.equal(deriveWorkspace({ environment: 'DEMO', tenantId: 't1' }).mode, 'demo')
  assert.equal(deriveWorkspace({ environment: 'LIVE', tenantId: 't1' }).mode, 'live')
})

test('DemoBanner hides in live mode', () => {
  assert.equal(shouldShowDemoBanner('live'), false)
  assert.equal(shouldShowDemoBanner('demo'), true)
})

test('Sidebar grouped and renamed nav labels render', () => {
  const labels = NAV_GROUPS.flatMap(g => [g.label, ...g.items.map(i => i.label)]).filter(Boolean).join(' | ')
  assert.match(labels, /Operations/)
  assert.match(labels, /Platform/)
  assert.match(labels, /Evidence/)
})

test('ActionButton demo label behavior', () => {
  const html = renderToStaticMarkup(<WorkspaceReactContext.Provider value={{ mode:'demo', tenantId:'t', tenantName:'Demo', dataReady:true }}><ActionButton variant='approve' /><ActionButton variant='execute' /></WorkspaceReactContext.Provider>)
  assert.match(html, /Simulate approval/)
  assert.match(html, /Simulate execution/)
})

test('shared UI components render', () => {
  const html = renderToStaticMarkup(<div><StatusPill status='ready' /><MetricCard label='L' value='1' /><SectionLabel>A</SectionLabel><TableRow columns='1fr 1fr'><span>x</span><span>y</span></TableRow><EmptyState title='No data' description='desc' /></div>)
  assert.match(html, /No data/)
})
