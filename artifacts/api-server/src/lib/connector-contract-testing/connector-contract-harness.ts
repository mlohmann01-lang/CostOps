import { connectorContractFixtures } from './connector-contract-fixtures';
import { validateOutputContract } from './connector-contract-validators';
import type { ConnectorContractFixture, ConnectorContractValidationResult, ContractHarnessRun } from './connector-contract-types';

export class ConnectorContractHarness {
  constructor(public fixtures: ConnectorContractFixture[] = connectorContractFixtures) {}

  getFixturesForConnector(connectorKey: string) { return this.fixtures.filter((fixture) => fixture.connectorKey === connectorKey); }
  getFixturesForFamily(connectorFamily: string) { return this.fixtures.filter((fixture) => fixture.connectorFamily === connectorFamily); }

  async runFixture(fixtureId: string): Promise<ConnectorContractValidationResult> {
    const fixture = this.fixtures.find((candidate) => candidate.id === fixtureId);
    if (!fixture) throw new Error('CONNECTOR_CONTRACT_FIXTURE_NOT_FOUND');
    const result = validateOutputContract(fixture.outputContract, { ...fixture.payload, connectorFamily: fixture.connectorFamily, connectorKey: fixture.connectorKey, fixtureId: fixture.id });
    return { ...result, connectorFamily: fixture.connectorFamily, connectorKey: fixture.connectorKey, fixtureId: fixture.id };
  }

  private async run(scope: ContractHarnessRun['scope'], id: string, fixtures: ConnectorContractFixture[]): Promise<ContractHarnessRun> {
    const results = await Promise.all(fixtures.map((fixture) => this.runFixture(fixture.id)));
    return { scope, id, results, passed: results.filter((r) => r.status === 'PASS').length, warned: results.filter((r) => r.status === 'WARN').length, failed: results.filter((r) => r.status === 'FAIL').length };
  }

  runConnector(connectorKey: string) { return this.run('CONNECTOR', connectorKey, this.getFixturesForConnector(connectorKey)); }
  runConnectorFamily(connectorFamily: string) { return this.run('FAMILY', connectorFamily, this.getFixturesForFamily(connectorFamily)); }
  runAll() { return this.run('ALL', 'all', this.fixtures); }
}

export const connectorContractHarness = new ConnectorContractHarness();
