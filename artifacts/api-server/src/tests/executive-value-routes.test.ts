import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('executive value routes expose summary domains drivers blockers and evidence pack endpoints', () => {
  const route = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/executive-value.ts'), 'utf8')
  for (const snippet of ["get('/summary'", "get('/domains'", "get('/top-drivers'", "get('/blockers'", "post('/evidence-pack'"]) assert.equal(route.includes(snippet), true)
  const index = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/index.ts'), 'utf8')
  assert.equal(index.includes('/executive-value'), true)
})

test('executive value routes are non-mutating and delegate evidence pack generation only', () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/executive-value.ts'), 'utf8') + fs.readFileSync(path.resolve(process.cwd(), 'src/lib/executive-value/executive-value-service.ts'), 'utf8')
  for (const forbidden of ['assignLicense', 'removeLicense', 'executionRequestsTable', 'approvalRequestsTable', 'approveRecommendation']) assert.equal(src.includes(forbidden), false)
  assert.equal(src.includes('packService.generate'), true)
})
