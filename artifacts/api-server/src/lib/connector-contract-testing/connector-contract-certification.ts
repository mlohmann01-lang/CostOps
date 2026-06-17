import { defaultConnectorManifests } from '../connector-readiness';
import { ConnectorContractHarness, connectorContractHarness } from './connector-contract-harness';
import type { ConnectorCertificationResult, ConnectorContractFixture } from './connector-contract-types';

const now = () => new Date().toISOString();
const id = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export class ConnectorContractCertificationService {
  constructor(public harness: ConnectorContractHarness = connectorContractHarness) {}

  async certifyConnector(connectorKey: string): Promise<ConnectorCertificationResult> {
    const manifest = defaultConnectorManifests.find((candidate) => candidate.connectorKey === connectorKey);
    if (!manifest) throw new Error('CONNECTOR_MANIFEST_NOT_FOUND');
    const fixtures = this.harness.getFixturesForConnector(connectorKey);
    const results = await Promise.all(fixtures.map((fixture) => this.harness.runFixture(fixture.id)));
    const requiredContracts = manifest.outputContracts;
    const blockers: ConnectorCertificationResult['blockers'] = [];
    const fixturesFor = (contract: string, type?: ConnectorContractFixture['fixtureType']) => fixtures.filter((fixture) => fixture.outputContract === contract && (!type || fixture.fixtureType === type));
    for (const contract of requiredContracts) {
      if (!fixturesFor(contract).length) blockers.push({ contractType: contract, reason: 'No contract fixtures exist for manifest output contract.', severity: 'CRITICAL' });
      if (!fixturesFor(contract, 'VALID').length) blockers.push({ contractType: contract, reason: 'No valid fixture exists for contract.', severity: 'HIGH' });
      if (!fixturesFor(contract, 'INVALID').length) blockers.push({ contractType: contract, reason: 'No invalid fixture exists for contract.', severity: 'HIGH' });
    }
    const validFixturesPassed = fixtures.filter((fixture) => fixture.fixtureType === 'VALID' && results.some((result) => result.fixtureId === fixture.id && result.status === 'PASS')).length;
    const invalidFixturesRejected = fixtures.filter((fixture) => fixture.fixtureType === 'INVALID' && results.some((result) => result.fixtureId === fixture.id && result.status === 'FAIL')).length;
    const edgeCaseFixturesHandled = fixtures.filter((fixture) => fixture.fixtureType === 'EDGE_CASE' && results.some((result) => result.fixtureId === fixture.id && ['PASS', 'WARN'].includes(result.status))).length;
    for (const fixture of fixtures.filter((x) => x.fixtureType === 'VALID')) if (!results.some((result) => result.fixtureId === fixture.id && result.status === 'PASS')) blockers.push({ contractType: fixture.outputContract, reason: 'Valid fixture did not pass.', severity: 'CRITICAL' });
    for (const fixture of fixtures.filter((x) => x.fixtureType === 'INVALID')) if (!results.some((result) => result.fixtureId === fixture.id && result.status === 'FAIL')) blockers.push({ contractType: fixture.outputContract, reason: 'Invalid fixture was not rejected.', severity: 'CRITICAL' });
    for (const fixture of fixtures.filter((x) => x.fixtureType === 'EDGE_CASE')) if (!results.some((result) => result.fixtureId === fixture.id && ['PASS', 'WARN'].includes(result.status))) blockers.push({ contractType: fixture.outputContract, reason: 'Edge-case fixture failed unexpectedly.', severity: 'HIGH' });
    const contractsTested = requiredContracts.filter((contract) => fixturesFor(contract).length).length;
    const graphMappingsPassed = requiredContracts.filter((contract) => results.some((result) => result.outputContract === contract && !!result.graphPreview)).length;
    const evidenceContractsPassed = requiredContracts.filter((contract) => results.some((result) => result.outputContract === contract && result.evidencePreview?.status === 'CREATED')).length;
    if (manifest.capabilityManifest.canMapToGraph && graphMappingsPassed < requiredContracts.length) blockers.push({ contractType: 'GRAPH', reason: 'One or more contracts lack graph previews.', severity: 'HIGH' });
    if (manifest.capabilityManifest.canProduceEvidence && evidenceContractsPassed < requiredContracts.length) blockers.push({ contractType: 'EVIDENCE', reason: 'One or more contracts lack evidence previews.', severity: 'HIGH' });
    const totalExpectations = requiredContracts.length * 5;
    const met = contractsTested + validFixturesPassed / Math.max(1, requiredContracts.length) * requiredContracts.length + invalidFixturesRejected / Math.max(1, requiredContracts.length) * requiredContracts.length + graphMappingsPassed + evidenceContractsPassed;
    const score = Math.max(0, Math.min(100, Math.round((met / totalExpectations) * 100) - blockers.filter((b) => b.severity === 'CRITICAL').length * 20));
    return { id: id('cert'), connectorFamily: manifest.connectorFamily, connectorKey, totalContracts: requiredContracts.length, contractsTested, validFixturesPassed, invalidFixturesRejected, edgeCaseFixturesHandled, graphMappingsPassed, evidenceContractsPassed, score, status: score >= 80 ? 'CERTIFIED' : score >= 50 ? 'PARTIAL' : 'FAILED', blockers, createdAt: now() };
  }

  async certifyConnectorFamily(connectorFamily: string) {
    const manifests = defaultConnectorManifests.filter((manifest) => manifest.connectorFamily === connectorFamily);
    return Promise.all(manifests.map((manifest) => this.certifyConnector(manifest.connectorKey)));
  }

  async certifyAllConnectors() {
    return Promise.all(defaultConnectorManifests.map((manifest) => this.certifyConnector(manifest.connectorKey)));
  }
}

export const connectorContractCertificationService = new ConnectorContractCertificationService();
