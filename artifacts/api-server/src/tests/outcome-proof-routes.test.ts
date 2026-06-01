import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

test('outcome proof routes expose canonical endpoints before outcomeId route', async () => {
  const routes = await readFile('src/routes/outcomes.ts', 'utf8')
  assert.ok(routes.indexOf("/proof/summary") < routes.indexOf("/proof/:outcomeId"))
  assert.equal(routes.includes("router.get('/proof'"), true)
  assert.equal(routes.includes("outcomeProofService.listProofs"), true)
  assert.equal(routes.includes("outcomeProofService.getSummary"), true)
})

test('legacy ledger routes are compatibility projections over proof authority', async () => {
  const ledger = await readFile('src/lib/outcomes/outcome-ledger.ts', 'utf8')
  assert.equal(ledger.includes('Compatibility projection'), true)
  assert.equal(ledger.includes('outcomeProofService.listProofs'), true)
  assert.equal(ledger.includes('OUTCOME_PROOF_AUTHORITY'), true)
})

test('execution and verification projection integrations do not add connector or execution mutation', async () => {
  const service = await readFile('src/lib/outcomes/execution-outcome-verification-service.ts', 'utf8')
  assert.equal(service.includes('outcomeProofService.projectFromExecutionResult'), true)
  assert.equal(service.includes('outcomeProofService.projectFromVerification'), true)
  assert.equal(service.includes('CONNECTOR'), false)
})
