import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('onboarding routes expose m365 lifecycle endpoints and register existing router', () => {
  const route = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/onboarding.ts'), 'utf8')
  for (const snippet of ['/m365/start', '/m365/readiness-check', '/m365/discovery', '/m365/trust-assessment', '/m365/opportunity-assessment', '/m365/pilot-mode', '/m365/go-live-checklist', '/m365/summary']) assert.equal(route.includes(snippet), true)
  const index = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/index.ts'), 'utf8')
  assert.equal(index.includes('router.use("/onboarding", onboardingRouter)'), true)
})

test('onboarding code has no execution approval creation or graph mutation calls', () => {
  const route = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/onboarding.ts'), 'utf8')
  const service = fs.readFileSync(path.resolve(process.cwd(), 'src/lib/onboarding/onboarding-service.ts'), 'utf8')
  for (const forbidden of ['assignLicense', 'removeLicense', 'executionRequestsTable', 'approvalRequestsTable', 'approveRecommendation']) assert.equal((route + service).includes(forbidden), false)
  assert.equal(service.includes('PlatformEventService') || service.includes('platformEventService'), true)
})
