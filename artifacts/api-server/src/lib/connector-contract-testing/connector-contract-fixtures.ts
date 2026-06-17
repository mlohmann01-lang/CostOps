import { defaultConnectorManifests } from '../connector-readiness';
import type { ConnectorContractFixture } from './connector-contract-types';

const createdAt = '2026-01-01T00:00:00.000Z';

const validPayload = (contract: string): Record<string, unknown> => {
  const common = { source: 'contract-fixture' };
  switch (contract) {
    case 'COMMERCIAL_VENDOR': return { vendorName: 'Contoso Software', category: 'SaaS', ...common };
    case 'TECHNOLOGY_CONTRACT': return { vendorId: 'vendor-1', name: 'Enterprise Agreement', status: 'ACTIVE', startDate: '2026-01-01', endDate: '2026-12-31', currency: 'USD', ...common };
    case 'TECHNOLOGY_ENTITLEMENT': return { vendorId: 'vendor-1', productName: 'M365 E5', entitlementType: 'SEAT', totalQuantity: 100, currency: 'USD', ...common };
    case 'COMMERCIAL_COMMITMENT': return { vendorId: 'vendor-1', contractId: 'contract-1', commitmentType: 'SPEND', committedValue: 10000, consumedValue: 2500, remainingValue: 7500, ...common };
    case 'COMMERCIAL_RENEWAL': return { vendorId: 'vendor-1', contractId: 'contract-1', renewalDate: '2026-11-30', currentAnnualSpend: 10000, readinessScore: 85, ...common };
    case 'FINANCIAL_INVOICE': return { invoiceNumber: 'INV-1', vendorId: 'vendor-1', invoiceDate: '2026-02-01', amount: 500, currency: 'USD', status: 'PAID', ...common };
    case 'FINANCIAL_PURCHASE_ORDER': return { poNumber: 'PO-1', vendorId: 'vendor-1', amount: 750, currency: 'USD', status: 'OPEN', ...common };
    case 'FINANCIAL_VENDOR_SPEND': return { vendorId: 'vendor-1', fiscalPeriod: '2026-02', fiscalYear: 2026, totalInvoiced: 500, totalPaid: 450, currency: 'USD', ...common };
    case 'FINANCIAL_COST_CENTRE': return { code: 'CC-100', name: 'IT Operations', currency: 'USD', ...common };
    case 'OWNERSHIP_USER': return { email: 'owner@example.com', displayName: 'Owner User', status: 'ACTIVE', ...common };
    case 'OWNERSHIP_DEPARTMENT': return { name: 'Engineering', costCentreIds: ['CC-100'], ...common };
    case 'OWNERSHIP_ASSIGNMENT': return { targetType: 'APPLICATION', targetId: 'app-1', assignmentType: 'OWNER', confidence: 0.95, ...common };
    case 'USAGE_SIGNAL': return { targetType: 'ENTITLEMENT', targetId: 'ent-1', metricName: 'activeUsers', metricValue: 42, observedAt: '2026-02-01T00:00:00.000Z', ...common };
    case 'EVIDENCE_PACK': return { evidenceRef: 'evidence://contract-test/1', evidenceType: 'CONTRACT_TEST', createdAt, ...common };
    case 'GRAPH_NODE': return { type: 'Vendor', displayName: 'Contoso Software', confidence: 0.9, ...common };
    case 'GRAPH_EDGE': return { fromNodeId: 'node-1', toNodeId: 'node-2', type: 'RELATES_TO', confidence: 0.9, ...common };
    default: return common;
  }
};

const invalidPayload = (contract: string): Record<string, unknown> => {
  const payload = validPayload(contract);
  delete payload.source;
  if ('amount' in payload) payload.amount = -1;
  if ('totalQuantity' in payload) payload.totalQuantity = -1;
  if ('confidence' in payload) payload.confidence = 2;
  if ('metricValue' in payload) payload.metricValue = -1;
  return payload;
};

const edgePayload = (contract: string): Record<string, unknown> => {
  const payload = validPayload(contract);
  return { ...payload, edgeCase: true };
};

export function generateConnectorContractFixtures(): ConnectorContractFixture[] {
  return defaultConnectorManifests.flatMap((manifest) => manifest.outputContracts.flatMap((contract) => {
    const prefix = `${manifest.connectorFamily.toLowerCase()}-${contract.toLowerCase()}`;
    const base = { connectorFamily: manifest.connectorFamily, connectorKey: manifest.connectorKey, outputContract: contract, source: 'connector-contract-fixture-generator', createdAt };
    return [
      { ...base, id: `${prefix}-valid`, fixtureType: 'VALID' as const, description: `${manifest.connectorName} valid ${contract} payload`, payload: validPayload(contract), expectedResult: 'PASS' as const },
      { ...base, id: `${prefix}-invalid`, fixtureType: 'INVALID' as const, description: `${manifest.connectorName} invalid ${contract} payload`, payload: invalidPayload(contract), expectedResult: 'FAIL' as const, expectedErrors: ['MISSING_REQUIRED_FIELD'] },
      { ...base, id: `${prefix}-edge`, fixtureType: 'EDGE_CASE' as const, description: `${manifest.connectorName} edge-case ${contract} payload`, payload: edgePayload(contract), expectedResult: 'WARN' as const },
    ];
  }));
}

export const connectorContractFixtures = generateConnectorContractFixtures();
