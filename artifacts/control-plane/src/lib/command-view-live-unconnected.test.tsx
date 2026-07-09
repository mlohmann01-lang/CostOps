/**
 * Rendered component test: CommandViewBody in LIVE_UNCONNECTED state.
 *
 * Uses renderToStaticMarkup (SSR, no effects) so we verify initial render output
 * with explicit workspace context — no actual API calls fire.
 *
 * Pass: rendered HTML contains required onboarding copy and no synthetic demo data.
 * Fail: any forbidden demo string appears (proves a gate is bypassed at render time).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Router } from 'wouter'
import { WorkspaceReactContext } from './workspaceContext'
import { CommandViewBody } from '../pages/CommandView'
import { assertNoSyntheticDataInLiveUnconnected, assertCommandViewLiveUnconnected } from './liveUnconnectedAssert'

// ─── Test workspace fixture ────────────────────────────────────────────────────

const LIVE_UNCONNECTED_CTX = {
  mode: 'live' as const,
  tenantId: 'test-tenant',
  tenantName: 'Test workspace',
  dataReady: false,
  runtimeState: 'LIVE_UNCONNECTED' as const,
  connectedCount: 0,
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const staticHook = (): any => ['/command', () => {}]

function renderCommandViewBody(workspace = LIVE_UNCONNECTED_CTX): string {
  return renderToStaticMarkup(
    <WorkspaceReactContext.Provider value={workspace}>
      <Router hook={staticHook}>
        <CommandViewBody />
      </Router>
    </WorkspaceReactContext.Provider>,
  )
}

// ─── Render smoke test ────────────────────────────────────────────────────────

test('CommandViewBody renders without throwing in LIVE_UNCONNECTED', () => {
  assert.doesNotThrow(() => renderCommandViewBody(), 'Component must render without error in LIVE_UNCONNECTED state')
})

// ─── Forbidden: synthetic demo data must not appear ───────────────────────────

const FORBIDDEN_TERMS: readonly string[] = [
  'ChatGPT',
  'Slack',
  'Claude',
  'Tableau',
  'Dropbox',
  '50,400',
  '97%',
  '1 / 7',
  '$0',
]

for (const term of FORBIDDEN_TERMS) {
  test(`CommandViewBody LIVE_UNCONNECTED: rendered HTML must not contain "${term}"`, () => {
    const html = renderCommandViewBody()
    assert.ok(
      !html.includes(term),
      `LIVE_UNCONNECTED rendered HTML must not contain "${term}" — synthetic demo data leak detected`,
    )
  })
}

// ─── Forbidden: value counts that betray active demo state ────────────────────

test('CommandViewBody LIVE_UNCONNECTED: does not show Authorities Active as 1', () => {
  const html = renderCommandViewBody()
  assert.ok(
    !html.includes('Authorities Active</') || !html.includes('>1<'),
    'Authorities Active value must not be 1 in LIVE_UNCONNECTED',
  )
  assertNoSyntheticDataInLiveUnconnected(html)
})

// ─── Required: onboarding copy must appear in content area ────────────────────

const REQUIRED_TERMS: readonly string[] = [
  'No production systems connected.',
  'Connect Microsoft 365 or another supported platform to begin discovery.',
  'No Findings Yet',
  'Connect a supported platform to begin discovery.',
  'Connect Microsoft 365',
  'Run Tenant Readiness',
  'Begin Discovery',
]

for (const term of REQUIRED_TERMS) {
  test(`CommandViewBody LIVE_UNCONNECTED: rendered HTML must contain "${term}"`, () => {
    const html = renderCommandViewBody()
    assert.ok(
      html.includes(term),
      `LIVE_UNCONNECTED rendered HTML must contain "${term}" — required onboarding copy is missing`,
    )
  })
}

// ─── Required: metric cards show gated values ─────────────────────────────────

test('CommandViewBody LIVE_UNCONNECTED: all value metric cards show dash', () => {
  const html = renderCommandViewBody()
  const dashCount = (html.match(/—/g) ?? []).length
  assert.ok(dashCount >= 5, `Expected at least 5 dash values in LIVE_UNCONNECTED, got ${dashCount}`)
})

test('CommandViewBody LIVE_UNCONNECTED: attention section shows No Findings Yet EmptyState', () => {
  const html = renderCommandViewBody()
  assert.ok(html.includes('No Findings Yet'), 'Attention section must show No Findings Yet EmptyState')
  assert.ok(
    html.includes('Connect a supported platform to begin discovery.'),
    'Attention EmptyState must include the connect CTA description',
  )
})

test('CommandViewBody LIVE_UNCONNECTED: chain stages Active count is 0 / 7', () => {
  const html = renderCommandViewBody()
  assert.ok(html.includes('0 / 7'), 'Chain Stages Active must show 0 / 7 in LIVE_UNCONNECTED')
  assert.ok(!html.includes('1 / 7'), 'Chain Stages Active must not show 1 / 7 in LIVE_UNCONNECTED')
})

test('CommandViewBody LIVE_UNCONNECTED: recommended next actions show onboarding actions', () => {
  const html = renderCommandViewBody()
  assert.ok(html.includes('Connect Microsoft 365'), 'Next actions must include Connect Microsoft 365')
  assert.ok(html.includes('Run Tenant Readiness'), 'Next actions must include Run Tenant Readiness')
  assert.ok(html.includes('Begin Discovery'), 'Next actions must include Begin Discovery')
})

// ─── Full combined assertion ───────────────────────────────────────────────────

test('CommandViewBody LIVE_UNCONNECTED: full assertCommandViewLiveUnconnected passes', () => {
  const html = renderCommandViewBody()
  assertCommandViewLiveUnconnected(html)
})
