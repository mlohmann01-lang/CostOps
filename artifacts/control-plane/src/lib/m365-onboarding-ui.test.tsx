import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('M365 onboarding page renders stepper panels pilot selector and checklist with no execute button', () => {
  const page = fs.readFileSync(new URL('../pages/M365OnboardingView.tsx', import.meta.url), 'utf8')
  for (const label of ['Microsoft 365 Onboarding', 'm365-onboarding-stepper', 'Readiness Panel', 'Discovery Panel', 'Trust Panel', 'Opportunity Panel', 'Pilot Mode Selector', 'Go-Live Checklist', 'CONTROLLED_EXECUTION', 'Controlled execution blocked']) assert.equal(page.includes(label), true)
  assert.equal(page.includes('Execute license'), false)
})

test('M365 onboarding hook uses demo state in demo and live APIs without demo fallback in live', () => {
  const hook = fs.readFileSync(new URL('../hooks/useM365OnboardingData.ts', import.meta.url), 'utf8')
  assert.equal(hook.includes("workspace.mode === 'demo'"), true)
  for (const path of ['/api/onboarding/m365/start', '/api/onboarding/m365/readiness-check', '/api/onboarding/m365/discovery', '/api/onboarding/m365/trust-assessment', '/api/onboarding/m365/opportunity-assessment', '/api/onboarding/m365/pilot-mode']) assert.equal(hook.includes(path), true)
  assert.equal(/catch\s*\([^)]*\)\s*\{[^}]*demoM365Onboarding/s.test(hook), false)
})

test('demo data includes dry-run-ready onboarding warnings and checklist', () => {
  const demo = fs.readFileSync(new URL('../data/demo.ts', import.meta.url), 'utf8')
  for (const label of ['demoM365Onboarding', 'demoM365GoLiveChecklist', 'DRY_RUN_READY', 'Write permission not granted', 'Live mutation disabled', 'Execution safety trust not high']) assert.equal(demo.includes(label), true)
})

test('existing UI surfaces link to onboarding and command shows priority action', () => {
  const hub = fs.readFileSync(new URL('../pages/ConnectorHub.tsx', import.meta.url), 'utf8')
  const command = fs.readFileSync(new URL('../pages/CommandView.tsx', import.meta.url), 'utf8')
  const runtime = fs.readFileSync(new URL('../pages/RuntimeHealthView.tsx', import.meta.url), 'utf8')
  const settings = fs.readFileSync(new URL('../pages/SettingsPage.tsx', import.meta.url), 'utf8')
  const sidebar = fs.readFileSync(new URL('../components/layout/Sidebar.tsx', import.meta.url), 'utf8')
  assert.equal(hub.includes('Continue onboarding'), true)
  assert.equal(command.includes('Complete M365 onboarding'), true)
  assert.equal(runtime.includes('M365 Onboarding'), true)
  assert.equal(settings.includes('/onboarding/m365'), true)
  assert.equal(sidebar.includes('M365 Onboarding'), true)
})
