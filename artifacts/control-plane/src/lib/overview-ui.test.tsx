import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { NAV_GROUPS } from '../components/layout/Sidebar'

const read = (path: string) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')

test('Overview route renders and Command links continue working', () => {
  const app = read('../App.tsx')
  assert.equal(app.includes('<Route path="/overview" component={CommandRoute} />'), true)
  assert.equal(app.includes('<Route path="/command"><RedirectRoute to="/overview" /></Route>'), true)
  assert.equal(app.includes('<Route path="/:domain/command" component={CommandRoute} />'), true)
})

test('Executive Brief cards render', () => {
  const page = read('../pages/CommandView.tsx')
  for (const label of ['Executive Brief', 'Projected Annual Value', 'Verified Annual Value', 'Ready Now', 'Awaiting Approval', 'Blocked', 'Trust Coverage']) assert.equal(page.includes(label), true)
  assert.equal(page.includes("data-testid='overview-executive-brief'"), true)
})

test('Executive narrative renders', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('What to care about today'), true)
  assert.equal(page.includes('Certen has identified'), true)
  assert.equal(page.includes('verified through controlled execution'), true)
  assert.equal(page.includes("data-testid='executive-narrative'"), true)
})

test('Top 3 priorities render with executive priority fields', () => {
  const page = read('../pages/CommandView.tsx')
  for (const label of ['What Matters Most', 'Top 3 Executive Priorities', 'Rank', 'Monthly Value', 'Readiness', 'Trust', 'Next:', 'Open Action', 'View Priorities']) assert.equal(page.includes(label), true)
  assert.equal(page.includes("data-testid='overview-priority-row'"), true)
})

test('Requires Attention renders blocker columns', () => {
  const page = read('../pages/CommandView.tsx')
  for (const label of ['Requires Attention', 'Blockers', 'Issue', 'Impact', 'Blocked Value', 'Required Action']) assert.equal(page.includes(label), true)
  assert.equal(page.includes("data-testid='requires-attention'"), true)
})

test('What Changed renders significant event section', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('What Changed'), true)
  assert.equal(page.includes('Significant events in the last 24 hours'), true)
  assert.equal(page.includes("data-testid='what-changed'"), true)
  assert.equal(page.includes('slice(0, 5)'), true)
})

test('Workspace removed from Executive navigation', () => {
  const executive = NAV_GROUPS.find((group) => group.label === 'Executive')
  assert.equal(executive?.items.some((item) => item.label === 'Workspace'), false)
})

test('Workspace appears under Admin', () => {
  const admin = NAV_GROUPS.find((group) => group.label === 'Admin')
  assert.equal(admin?.items.some((item) => item.label === 'Workspace' && item.href === '/workspace'), true)
})

test('Overview links to Actions and footer quick links stay capped', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes("href='/actions'"), true)
  assert.equal(page.includes("data-testid='overview-quick-links'"), true)
  const quickLinkLabels = ['Open Actions', 'Open Executive Value', 'Open Evidence Packs', 'Open Outcomes', 'Open Priorities']
  for (const label of quickLinkLabels) assert.equal(page.includes(label), true)
  assert.equal(quickLinkLabels.length <= 5, true)
})

test('No execution controls appear on Overview', () => {
  const page = read('../pages/CommandView.tsx')
  for (const forbidden of ['Execute now', 'Queue for execution', 'Start execution', 'Mark executed', 'Simulate approval', 'Simulate execution', 'transitionAction(', 'onTransition']) assert.equal(page.includes(forbidden), false)
})

test('No LeftShield-specific security labels appear', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('LeftShield'), false)
  assert.equal(page.includes('Agent Security Analytics'), false)
})
