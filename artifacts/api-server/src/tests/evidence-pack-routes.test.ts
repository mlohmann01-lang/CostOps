import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('evidence pack routes expose generate list get json pdf and audit endpoints', () => {
  const route = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/evidence-packs.ts'), 'utf8')
  for (const snippet of ["post('/generate'", "get('/'", "get('/:id'", "get('/:id/json'", "get('/:id/pdf'", "get('/:id/audit'"]) assert.equal(route.includes(snippet), true)
  const index = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/index.ts'), 'utf8')
  assert.equal(index.includes('/evidence-packs'), true)
})

test('evidence pack routes are read/export only and do not mutate graph or create approvals', () => {
  const src = fs.readFileSync(path.resolve(process.cwd(), 'src/routes/evidence-packs.ts'), 'utf8') + fs.readFileSync(path.resolve(process.cwd(), 'src/lib/evidence-pack/evidence-pack-service.ts'), 'utf8')
  for (const forbidden of ['assignLicense', 'removeLicense', 'executionRequestsTable', 'approvalRequestsTable', 'approveRecommendation']) assert.equal(src.includes(forbidden), false)
})
