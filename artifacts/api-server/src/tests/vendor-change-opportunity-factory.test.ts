import test from 'node:test'
import assert from 'node:assert/strict'
import { ExecutionRequestService } from '../lib/execution/execution-request-service'
import { OpportunityRepository } from '../lib/opportunities/opportunity-repository'
import { VendorChangePipelineService } from '../lib/vcde/vendor-change-pipeline-service'
import { VendorChangeRepository } from '../lib/vcde/vendor-change-repository'
import { VendorSignalIngestionService } from '../lib/vcde/vendor-signal-ingestion-service'
import { VendorSignalRepository } from '../lib/vcde/vendor-signal-repository'

test('vendor change promotion flows through Opportunity Factory and does not create execution or approval', async () => {
  const tenantId = 'tenant-vcde-factory'
  const repo = new VendorChangeRepository(); repo.clearForTests()
  const signalRepo = new VendorSignalRepository(); signalRepo.clearForTests()
  const opportunityRepo = new OpportunityRepository(); opportunityRepo.clearForTests()
  const pipeline = new VendorChangePipelineService(repo, new VendorSignalIngestionService(signalRepo), opportunityRepo)
  const ingested = pipeline.ingestSignal({ tenantId, vendor: 'AWS', sourceType: 'MANUAL', sourceUrl: 'https://aws.example/savings', title: 'AWS savings plan discount update', rawText: 'AWS savings plan discount update for committed use' })
  const promoted = await pipeline.promoteToOpportunity(tenantId, ingested.change!.id)
  assert.ok((promoted?.opportunities.length ?? 0) > 0)
  assert.equal(promoted?.opportunities.every((opportunity: any) => opportunity.source === 'VENDOR_CHANGE'), true)
  assert.equal(promoted?.opportunities.every((opportunity: any) => opportunity.sourceReferenceId === ingested.change!.id), true)
  assert.equal((await new ExecutionRequestService().list(tenantId)).length, 0)
})
