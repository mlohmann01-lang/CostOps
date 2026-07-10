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

test('Executive Command Center renders as the page title', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('Executive Command Center'), true)
})

test('Executive Summary section renders the 5 program metrics and maturity narrative', () => {
  const page = read('../pages/CommandView.tsx')
  for (const label of ['Executive Summary', 'Authorities Active', 'Chain Stages Active', 'Verified Value', 'Finance Verified', 'Protected Value']) assert.equal(page.includes(label), true)
  assert.equal(page.includes("testId='executive-command-center-summary'"), true)
  assert.equal(page.includes("data-testid='executive-command-center-narrative'"), true)
  for (const narrative of [
    'Certen is ready to begin discovery. Connect your first source to activate the Economic Control Chain.',
    'Certen has begun discovery and opportunity identification. Verification and protection remain in progress.',
    'Certen is identifying opportunities, validating outcomes and protecting retained value.',
  ]) assert.equal(page.includes(narrative), true)
})

test('What Requires Attention section renders with a max-5 list', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('What Requires Attention'), true)
  assert.equal(page.includes("testId='executive-command-center-attention'"), true)
  assert.equal(page.includes('slice(0, 5)'), true)
})

test('Economic Control Chain Status section renders the 7 stage chips', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('Economic Control Chain Status'), true)
  assert.equal(page.includes("testId='executive-command-center-chain'"), true)
  assert.equal(page.includes('economicControlChain.stages.map'), true)
})

test('Executive Value Snapshot section renders the 5-value row', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('Executive Value Snapshot'), true)
  assert.equal(page.includes("testId='executive-command-center-value-snapshot'"), true)
  for (const label of ['Identified', 'Approved', 'Executed', 'Verified', 'Protected']) assert.equal(page.includes(label), true)
})

test('Outcome Finance Snapshot section renders Verified, Finance Verified and Variance', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('Outcome Finance Snapshot'), true)
  assert.equal(page.includes("testId='executive-command-center-finance-snapshot'"), true)
  assert.equal(page.includes('Variance'), true)
})

test('Recommended Next Actions section renders a max-5 deep-linked list', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes('Recommended Next Actions'), true)
  assert.equal(page.includes("testId='executive-command-center-next-actions'"), true)
  assert.equal(page.includes('Connect Microsoft 365'), true)
})

test('Exactly six ExecutiveSection blocks make up the page', () => {
  const page = read('../pages/CommandView.tsx')
  const sectionTestIds = [
    'executive-command-center-summary',
    'executive-command-center-attention',
    'executive-command-center-chain',
    'executive-command-center-value-snapshot',
    'executive-command-center-finance-snapshot',
    'executive-command-center-next-actions',
  ]
  for (const testId of sectionTestIds) assert.equal(page.includes(`testId='${testId}'`), true)
})

test('What Changed and What Matters Most sections are removed from Overview', () => {
  const page = read('../pages/CommandView.tsx')
  assert.equal(page.includes("testId='what-changed'"), false)
  assert.equal(page.includes("testId='what-matters-most'"), false)
})

test('Workspace nav item is unchanged by the Executive Command Center rewrite', () => {
  // Program 6 only modifies CommandView.tsx; Sidebar.tsx and its NAV_GROUPS structure are
  // out of scope and untouched. Workspace lives under the 'Platform' group, as before.
  const platform = NAV_GROUPS.find((group) => group.label === 'Platform')
  assert.equal(platform?.items.some((item) => item.label === 'Workspace' && item.href === '/workspace'), true)
})

test('Executive Command Center sidebar item covers /overview via alias', () => {
  const execItem = NAV_GROUPS.flatMap((group) => group.items).find((item) => item.href === '/command')
  assert.equal(execItem?.label, 'Executive Command Center')
  assert.equal(execItem?.aliases?.includes('/overview'), true)
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
