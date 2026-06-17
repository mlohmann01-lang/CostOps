import type { ConnectorFamily, OutputContract } from '../connector-readiness';

export type FixtureType = 'VALID' | 'INVALID' | 'EDGE_CASE';
export type ContractStatus = 'PASS' | 'WARN' | 'FAIL';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ConnectorContractFixture {
  id: string;
  connectorFamily: ConnectorFamily;
  connectorKey: string;
  outputContract: string;
  fixtureType: FixtureType;
  description: string;
  payload: Record<string, unknown>;
  expectedResult: ContractStatus;
  expectedErrors?: string[];
  source: string;
  createdAt: string;
}

export interface ConnectorContractValidationResult {
  id: string;
  connectorFamily: string;
  connectorKey: string;
  outputContract: string;
  fixtureId: string;
  status: ContractStatus;
  errors: Array<{ code: string; message: string; path?: string; severity: Severity }>;
  warnings: Array<{ code: string; message: string; path?: string }>;
  normalisedPreview?: Record<string, unknown>;
  graphPreview?: { nodeTypes: string[]; edgeTypes: string[] };
  evidencePreview?: { evidenceType: string; evidenceRef?: string; status: 'CREATED' | 'FAILED' | 'NOT_REQUIRED' };
  createdAt: string;
}

export interface ConnectorCertificationResult {
  id: string;
  connectorFamily: string;
  connectorKey: string;
  totalContracts: number;
  contractsTested: number;
  validFixturesPassed: number;
  invalidFixturesRejected: number;
  edgeCaseFixturesHandled: number;
  graphMappingsPassed: number;
  evidenceContractsPassed: number;
  score: number;
  status: 'CERTIFIED' | 'PARTIAL' | 'FAILED';
  blockers: Array<{ contractType: string; reason: string; severity: Severity }>;
  createdAt: string;
}

export type ContractRule = {
  required: string[];
  nonNegative?: string[];
  confidence?: string[];
  score?: string[];
  arrays?: string[];
  normalisedType: string;
  nodeTypes: string[];
  edgeTypes: string[];
  evidenceType?: string;
};

export type ContractHarnessRun = {
  scope: 'FIXTURE' | 'CONNECTOR' | 'FAMILY' | 'ALL';
  id: string;
  results: ConnectorContractValidationResult[];
  passed: number;
  warned: number;
  failed: number;
};
