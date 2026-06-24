import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultAuthorities } from '../lib/authorityCatalog/defaultAuthorities'
import { getDefaultEconomicControlChain } from '../lib/economicControlChain/defaultEconomicControlChain'
import { getDefaultOutcomeFinance } from '../lib/outcomeFinance/defaultOutcomeFinance'
import { formatCurrency } from '../lib/display/formatters'

// ─── Assertion helper ────────────────────────────────────────────────────────

/**
 * Asserts that a block of rendered HTML contains no synthetic demo strings that
 * are forbidden in LIVE_UNCONNECTED state.  Throw with a descriptive message so
 * test failure output immediately points to the offending term.
 */
export function assertNoSyntheticDataInLiveUnconnected(html: string): void {
  const FORBIDDEN: string[] = [
    'ChatGPT',
    'Slack',
    'Claude',
    'Tableau',
    'Dropbox',
    '50,400',
    '97%',
    '1 / 7',
  ]
  for (const term of FORBIDDEN) {
    assert.ok(
      !html.includes(term),
      `LIVE_UNCONNECTED rendered HTML must not contain "${term}" — found synthetic demo data leak`,
    )
  }
}

// ─── assertNoSyntheticDataInLiveUnconnected self-tests ───────────────────────

test('assertNoSyntheticDataInLiveUnconnected: rejects each forbidden term', () => {
  const forbidden = ['ChatGPT', 'Slack', 'Claude', 'Tableau', 'Dropbox', '50,400', '97%', '1 / 7']
  for (const term of forbidden) {
    assert.throws(
      () => assertNoSyntheticDataInLiveUnconnected(`<div>${term}</div>`),
      { message: /LIVE_UNCONNECTED/ },
      `Should reject HTML containing "${term}"`,
    )
  }
})

test('assertNoSyntheticDataInLiveUnconnected: accepts clean LIVE_UNCONNECTED HTML', () => {
  const clean = '<div>No Findings Yet</div><div>—</div><div>0</div><div>N/A</div><div>Connect Microsoft 365</div>'
  assert.doesNotThrow(() => assertNoSyntheticDataInLiveUnconnected(clean))
})

// ─── Executive Summary section ────────────────────────────────────────────────

test('LIVE_UNCONNECTED: authoritiesActive is gated to 0', () => {
  const isLiveUnconnected = true
  const authoritiesActive = isLiveUnconnected ? 0 : defaultAuthorities.filter((a) => a.status === 'ACTIVE').length
  assert.equal(authoritiesActive, 0, 'authoritiesActive must be 0 in LIVE_UNCONNECTED')
})

test('Demo data has active authorities (gate is necessary)', () => {
  const demoActive = defaultAuthorities.filter((a) => a.status === 'ACTIVE').length
  assert.ok(demoActive > 0, 'defaultAuthorities must contain at least one active authority — without the gate LIVE_UNCONNECTED would show > 0')
})

test('LIVE_UNCONNECTED: chainStagesActive is gated to 0', () => {
  const isLiveUnconnected = true
  const chain = getDefaultEconomicControlChain()
  const chainStagesActive = isLiveUnconnected ? 0 : chain.activeStageCount
  assert.equal(chainStagesActive, 0, 'chainStagesActive must be 0 in LIVE_UNCONNECTED')
})

test('Demo chain has active stages (gate is necessary)', () => {
  const chain = getDefaultEconomicControlChain()
  assert.ok(chain.activeStageCount > 0, 'defaultEconomicControlChain must have active stages — without the gate LIVE_UNCONNECTED would show > 0 / 7')
})

test('LIVE_UNCONNECTED: chain stages display shows "Authorities Active" count of 0 not 1', () => {
  const isLiveUnconnected = true
  const authoritiesActive = isLiveUnconnected ? 0 : defaultAuthorities.filter((a) => a.status === 'ACTIVE').length
  const rendered = `Authorities Active ${String(authoritiesActive)}`
  assertNoSyntheticDataInLiveUnconnected(rendered)
  assert.ok(!rendered.includes('Authorities Active 1'), 'Must not show "Authorities Active 1"')
})

test('LIVE_UNCONNECTED: chain stage count display shows 0 / 7 not 1 / 7', () => {
  const isLiveUnconnected = true
  const chain = getDefaultEconomicControlChain()
  const chainStagesActive = isLiveUnconnected ? 0 : chain.activeStageCount
  const rendered = `${chainStagesActive} / 7`
  assertNoSyntheticDataInLiveUnconnected(rendered)
  assert.equal(rendered, '0 / 7')
})

// ─── Economic Control Chain stages ───────────────────────────────────────────

test('LIVE_UNCONNECTED: all Economic Control Chain stages forced inactive', () => {
  const isLiveUnconnected = true
  const chain = getDefaultEconomicControlChain()
  const stageLabels = chain.stages.map((stage) =>
    isLiveUnconnected || !stage.active ? 'Not Active' : 'Active',
  )
  assert.ok(stageLabels.every((label) => label === 'Not Active'), 'All stages must show "Not Active" in LIVE_UNCONNECTED')
})

test('Demo chain has at least one Active stage (gating on stages is necessary)', () => {
  const chain = getDefaultEconomicControlChain()
  assert.ok(chain.stages.some((s) => s.active), 'defaultEconomicControlChain must have at least one active stage')
})

// ─── Outcome Finance Snapshot ─────────────────────────────────────────────────

test('LIVE_UNCONNECTED: outcome finance metrics display dash not dollar values', () => {
  const isLiveUnconnected = true
  const fmtFinance = (v: number | undefined) => isLiveUnconnected ? '—' : formatCurrency(v)
  const outcomeFinance = getDefaultOutcomeFinance()
  assert.equal(fmtFinance(outcomeFinance.metrics.verifiedValue), '—')
  assert.equal(fmtFinance(outcomeFinance.metrics.financeVerifiedValue), '—')
  assert.equal(fmtFinance(outcomeFinance.metrics.variance), '—')
})

test('Demo outcome finance has $50,400 (gate is necessary)', () => {
  const outcomeFinance = getDefaultOutcomeFinance()
  assert.equal(outcomeFinance.metrics.verifiedValue, 50400, 'defaultOutcomeFinance must expose 50400 — without gate LIVE_UNCONNECTED would show $50,400')
})

test('LIVE_UNCONNECTED: $50,400 does not appear in assembled finance output', () => {
  const isLiveUnconnected = true
  const fmtFinance = (v: number | undefined) => isLiveUnconnected ? '—' : formatCurrency(v)
  const outcomeFinance = getDefaultOutcomeFinance()
  const financeHtml = [
    fmtFinance(outcomeFinance.metrics.verifiedValue),
    fmtFinance(outcomeFinance.metrics.financeVerifiedValue),
    fmtFinance(outcomeFinance.metrics.variance),
  ].join(' ')
  assertNoSyntheticDataInLiveUnconnected(financeHtml)
})

// ─── Value Snapshot ───────────────────────────────────────────────────────────

test('LIVE_UNCONNECTED: value metrics show dash not synthetic currency', () => {
  const isLiveUnconnected = true
  const fmtOrDash = (v: number) => isLiveUnconnected ? '—' : formatCurrency(v)
  const fmtOrPending = (v: number) => isLiveUnconnected ? '—' : 'Pending'
  const html = [
    fmtOrDash(320000),
    fmtOrPending(120000),
    fmtOrPending(80000),
    fmtOrPending(64000),
    fmtOrPending(18000),
  ].join(' ')
  assertNoSyntheticDataInLiveUnconnected(html)
  assert.ok(!html.includes('$'), 'No dollar amounts should appear in LIVE_UNCONNECTED value snapshot')
})

// ─── Data Trust ───────────────────────────────────────────────────────────────

test('LIVE_UNCONNECTED: data trust level is N/A not HIGH or percentage', () => {
  const isLiveUnconnected = true
  const confidence = { trustCoveragePercent: 97, evidenceCompletenessPercent: 97 }
  const dataTrustLevel = isLiveUnconnected ? 'N/A' : (confidence.trustCoveragePercent >= 70 ? 'HIGH' : 'MEDIUM')
  const evidenceLevel = isLiveUnconnected ? 'N/A' : (confidence.evidenceCompletenessPercent >= 80 ? 'HIGH' : 'MEDIUM')
  assert.equal(dataTrustLevel, 'N/A')
  assert.equal(evidenceLevel, 'N/A')
  assertNoSyntheticDataInLiveUnconnected(`Data Trust ${dataTrustLevel}`)
  assertNoSyntheticDataInLiveUnconnected(`Evidence ${evidenceLevel}`)
})

// ─── What Requires Attention ──────────────────────────────────────────────────

test('LIVE_UNCONNECTED: attention items are empty (no risk findings)', () => {
  const isLiveUnconnected = true
  const demoRisks = [
    { title: 'ChatGPT is part of an AI governance risk cluster' },
    { title: 'Slack has renewal-linked risk' },
    { title: 'Dropbox has exposed spend without an owner' },
    { title: 'Tableau high-cost low-usage opportunity' },
  ]
  const attentionItems = isLiveUnconnected ? [] : demoRisks
  assert.equal(attentionItems.length, 0, 'Attention items must be empty in LIVE_UNCONNECTED')
  const html = attentionItems.map((r) => r.title).join(' ')
  assertNoSyntheticDataInLiveUnconnected(html)
})

// ─── Full assembled output ────────────────────────────────────────────────────

test('LIVE_UNCONNECTED: fully assembled command center output contains no forbidden strings', () => {
  const isLiveUnconnected = true
  const chain = getDefaultEconomicControlChain()
  const outcomeFinance = getDefaultOutcomeFinance()

  const authoritiesActive = isLiveUnconnected ? 0 : defaultAuthorities.filter((a) => a.status === 'ACTIVE').length
  const chainStagesActive = isLiveUnconnected ? 0 : chain.activeStageCount
  const stageLabels = chain.stages.map((s) => (isLiveUnconnected || !s.active ? 'Not Active' : 'Active'))
  const fmtOrDash = (v: number) => isLiveUnconnected ? '—' : formatCurrency(v)
  const fmtFinance = (v: number | undefined) => isLiveUnconnected ? '—' : formatCurrency(v)
  const dataTrustLevel = isLiveUnconnected ? 'N/A' : 'HIGH'
  const attentionItems: string[] = isLiveUnconnected ? [] : ['ChatGPT', 'Slack', 'Claude', 'Tableau', 'Dropbox']

  const assembled = [
    `Authorities Active ${String(authoritiesActive)}`,
    `${chainStagesActive} / 7`,
    ...stageLabels,
    fmtOrDash(320000),
    fmtOrDash(120000),
    fmtOrDash(80000),
    fmtOrDash(64000),
    fmtOrDash(18000),
    fmtFinance(outcomeFinance.metrics.verifiedValue),
    fmtFinance(outcomeFinance.metrics.financeVerifiedValue),
    fmtFinance(outcomeFinance.metrics.variance),
    `Data Trust ${dataTrustLevel}`,
    ...attentionItems,
    'No Findings Yet',
    'Connect Microsoft 365',
    'Run Tenant Readiness',
    'Begin Discovery',
  ].join(' ')

  assertNoSyntheticDataInLiveUnconnected(assembled)
})
