import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const productionFiles = ['src/lib/connectors/m365/m365-readiness.ts', 'src/lib/connectors/m365/m365-discovery-service.ts', 'src/lib/connectors/m365/m365-health.ts', 'src/lib/connectors/m365/m365-trust.ts', 'src/lib/connectors/m365/m365-connector.ts']

test('Sprint 1 M365 production connector path has no Graph mutation calls or approval/execution creation', async () => {
  const body = (await Promise.all(productionFiles.map((file) => readFile(file, 'utf8')))).join('\n')
  assert.equal(/assignLicense|removeUserLicenses|executionRequestsTable|approval_requests|recommendationsTable|runOpportunityFactory|method:\s*['"]POST['"]/.test(body), false)
})
