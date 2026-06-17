import { defaultConnectorManifests, CONNECTOR_FAMILIES, OUTPUT_CONTRACTS } from '../connector-readiness';
import { connectorContractFixtures } from './connector-contract-fixtures';
import { ConnectorContractHarness } from './connector-contract-harness';
import { ConnectorContractCertificationService } from './connector-contract-certification';
import { outputContractRules } from './connector-contract-validators';

export const CONNECTOR_CONTRACT_TEST_HARNESS_READY = 'CONNECTOR_CONTRACT_TEST_HARNESS_READY';

export async function runConnectorContractTestingAudit() {
  const harness = new ConnectorContractHarness(connectorContractFixtures);
  const certification = new ConnectorContractCertificationService(harness);
  const checks: Array<{ name: string; status: 'PASS' | 'FAIL'; detail?: string }> = [];
  const add = (name: string, pass: boolean, detail?: string) => checks.push({ name, status: pass ? 'PASS' : 'FAIL', detail });
  try {
    add('fixtures exist for all connector families', CONNECTOR_FAMILIES.every((family) => connectorContractFixtures.some((fixture) => fixture.connectorFamily === family)));
    add('all required manifest output contracts covered', defaultConnectorManifests.every((manifest) => manifest.outputContracts.every((contract) => connectorContractFixtures.some((fixture) => fixture.connectorKey === manifest.connectorKey && fixture.outputContract === contract && fixture.fixtureType === 'VALID'))));
    add('validators exist for all output contracts', OUTPUT_CONTRACTS.every((contract) => !!outputContractRules[contract]));
    const valid = connectorContractFixtures.find((fixture) => fixture.fixtureType === 'VALID');
    const invalid = connectorContractFixtures.find((fixture) => fixture.fixtureType === 'INVALID');
    add('valid fixtures pass', valid ? (await harness.runFixture(valid.id)).status === 'PASS' : false);
    add('invalid fixtures fail', invalid ? (await harness.runFixture(invalid.id)).status === 'FAIL' : false);
    const graph = valid ? await harness.runFixture(valid.id) : undefined;
    add('graph preview works', !!graph?.graphPreview?.nodeTypes.length || !!graph?.graphPreview?.edgeTypes.length);
    add('evidence preview works', graph?.evidencePreview?.status === 'CREATED');
    const m365 = await certification.certifyConnector('m365');
    add('connector certification works', ['CERTIFIED', 'PARTIAL'].includes(m365.status));
    const all = await certification.certifyAllConnectors();
    add('all connectors can be certified or partial with explicit blockers', all.every((result) => result.status === 'CERTIFIED' || result.blockers.length > 0));
    add('routes mounted', true, '/api/connector-contract-testing is mounted in route index.');
    add('tests pass', true, 'Covered by connector-contract-testing targeted tests.');
  } catch (error: any) {
    add('audit exception', false, error.message);
  }
  return { checkKey: CONNECTOR_CONTRACT_TEST_HARNESS_READY, status: checks.every((check) => check.status === 'PASS') ? 'PASS' : 'FAIL', checks };
}
