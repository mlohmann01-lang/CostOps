import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('Recommendations surface M365 economic hardening fields', () => {
  const page = fs.readFileSync(new URL('../pages/recommendations.tsx', import.meta.url), 'utf8')
  assert.ok(page.includes('Savings Confidence'))
  assert.ok(page.includes('Evidence Quality'))
  assert.ok(page.includes('Execution Safety'))
  assert.ok(page.includes('Required Human Review'))
  assert.ok(page.includes('Allowed Next Step'))
})

test('Command groups M365 opportunities by production readiness steps', () => {
  const page = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  assert.ok(page.includes('READY_FOR_APPROVAL'))
  assert.ok(page.includes('REVIEW_REQUIRED'))
  assert.ok(page.includes('BLOCKED'))
  assert.ok(page.includes('SHOW_OPPORTUNITY'))
})

test('Connector Hub and Data Trust copy warn that investigate is not execution-ready', () => {
  const m365Page = fs.readFileSync(new URL('../pages/connectors-m365.tsx', import.meta.url), 'utf8')
  const dataTrustPage = fs.readFileSync(new URL('../pages/DataTrustView.tsx', import.meta.url), 'utf8')
  assert.ok(m365Page.includes('Ready for approval'))
  assert.ok(m365Page.includes('Needs hardening'))
  assert.ok(m365Page.includes('Not ready'))
  assert.ok(m365Page.includes('Investigate trust is not sufficient for live M365 execution.'))
  assert.ok(dataTrustPage.includes('Investigate trust is not sufficient for live M365 execution.'))
})

test('live command error path does not fall back to demo seed data', () => {
  const commandData = fs.readFileSync(new URL('./commandViewData.ts', import.meta.url), 'utf8')
  assert.ok(commandData.includes("dataSource: 'LIVE_ERROR'"))
  assert.equal(commandData.includes("DEMO_SEED' as any } as CommandViewState\n  } catch"), false)
})
