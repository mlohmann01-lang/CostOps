import type { ConnectorContractValidationResult, ContractRule, Severity } from './connector-contract-types';

const now = () => new Date().toISOString();
const id = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const has = (payload: Record<string, unknown>, field: string) => payload[field] !== undefined && payload[field] !== null && payload[field] !== '';
const err = (code: string, message: string, path?: string, severity: Severity = 'HIGH') => ({ code, message, path, severity });

export const outputContractRules: Record<string, ContractRule> = {
  COMMERCIAL_VENDOR: { required: ['vendorName', 'category', 'source'], normalisedType: 'CommercialVendor', nodeTypes: ['Vendor'], edgeTypes: ['VENDOR_SOURCE'], evidenceType: 'COMMERCIAL_VENDOR_CONTRACT_TEST' },
  TECHNOLOGY_CONTRACT: { required: ['vendorId', 'name', 'status', 'startDate', 'endDate', 'currency', 'source'], normalisedType: 'TechnologyContract', nodeTypes: ['Vendor', 'Contract'], edgeTypes: ['VENDOR_HAS_CONTRACT'], evidenceType: 'TECHNOLOGY_CONTRACT_TEST' },
  TECHNOLOGY_ENTITLEMENT: { required: ['vendorId', 'productName', 'entitlementType', 'totalQuantity', 'currency', 'source'], nonNegative: ['totalQuantity'], normalisedType: 'TechnologyEntitlement', nodeTypes: ['Vendor', 'Entitlement'], edgeTypes: ['VENDOR_HAS_ENTITLEMENT'], evidenceType: 'ENTITLEMENT_TEST' },
  COMMERCIAL_COMMITMENT: { required: ['vendorId', 'contractId', 'commitmentType', 'committedValue', 'consumedValue', 'remainingValue', 'source'], nonNegative: ['committedValue', 'consumedValue', 'remainingValue'], normalisedType: 'CommercialCommitment', nodeTypes: ['Contract', 'Commitment'], edgeTypes: ['CONTRACT_HAS_COMMITMENT'], evidenceType: 'COMMITMENT_TEST' },
  COMMERCIAL_RENEWAL: { required: ['vendorId', 'contractId', 'renewalDate', 'currentAnnualSpend', 'readinessScore', 'source'], nonNegative: ['currentAnnualSpend'], score: ['readinessScore'], normalisedType: 'CommercialRenewal', nodeTypes: ['Contract', 'Renewal'], edgeTypes: ['CONTRACT_HAS_RENEWAL'], evidenceType: 'RENEWAL_TEST' },
  FINANCIAL_INVOICE: { required: ['invoiceNumber', 'vendorId', 'invoiceDate', 'amount', 'currency', 'status', 'source'], nonNegative: ['amount'], normalisedType: 'FinancialInvoice', nodeTypes: ['Vendor', 'Invoice'], edgeTypes: ['VENDOR_HAS_INVOICE'], evidenceType: 'FINANCIAL_INVOICE_TEST' },
  FINANCIAL_PURCHASE_ORDER: { required: ['poNumber', 'vendorId', 'amount', 'currency', 'status', 'source'], nonNegative: ['amount'], normalisedType: 'FinancialPurchaseOrder', nodeTypes: ['Vendor', 'PurchaseOrder'], edgeTypes: ['VENDOR_HAS_PURCHASE_ORDER'], evidenceType: 'PURCHASE_ORDER_TEST' },
  FINANCIAL_VENDOR_SPEND: { required: ['vendorId', 'fiscalPeriod', 'fiscalYear', 'totalInvoiced', 'totalPaid', 'currency', 'source'], nonNegative: ['totalInvoiced', 'totalPaid'], normalisedType: 'FinancialVendorSpend', nodeTypes: ['Vendor', 'Spend'], edgeTypes: ['VENDOR_HAS_SPEND'], evidenceType: 'VENDOR_SPEND_TEST' },
  FINANCIAL_COST_CENTRE: { required: ['code', 'name', 'currency', 'source'], normalisedType: 'FinancialCostCentre', nodeTypes: ['CostCentre'], edgeTypes: ['COST_CENTRE_SOURCE'], evidenceType: 'COST_CENTRE_TEST' },
  OWNERSHIP_USER: { required: ['email', 'displayName', 'status', 'source'], normalisedType: 'OwnershipUser', nodeTypes: ['User'], edgeTypes: ['USER_SOURCE'], evidenceType: 'OWNERSHIP_USER_TEST' },
  OWNERSHIP_DEPARTMENT: { required: ['name', 'costCentreIds', 'source'], arrays: ['costCentreIds'], normalisedType: 'OwnershipDepartment', nodeTypes: ['Department', 'CostCentre'], edgeTypes: ['DEPARTMENT_USES_COST_CENTRE'], evidenceType: 'DEPARTMENT_TEST' },
  OWNERSHIP_ASSIGNMENT: { required: ['targetType', 'targetId', 'assignmentType', 'confidence', 'source'], confidence: ['confidence'], normalisedType: 'OwnershipAssignment', nodeTypes: ['Owner', 'AssignableTarget'], edgeTypes: ['OWNS'], evidenceType: 'OWNERSHIP_ASSIGNMENT_TEST' },
  USAGE_SIGNAL: { required: ['targetType', 'targetId', 'metricName', 'metricValue', 'observedAt', 'source'], nonNegative: ['metricValue'], normalisedType: 'UsageSignal', nodeTypes: ['UsageTarget', 'UsageSignal'], edgeTypes: ['TARGET_HAS_USAGE'], evidenceType: 'USAGE_SIGNAL_TEST' },
  EVIDENCE_PACK: { required: ['evidenceRef', 'evidenceType', 'source', 'createdAt'], normalisedType: 'EvidencePack', nodeTypes: ['EvidencePack'], edgeTypes: ['EVIDENCE_SUPPORTS_OBJECT'], evidenceType: 'EVIDENCE_PACK_CONTRACT_TEST' },
  GRAPH_NODE: { required: ['type', 'displayName', 'source', 'confidence'], confidence: ['confidence'], normalisedType: 'GraphNode', nodeTypes: ['GraphNode'], edgeTypes: [], evidenceType: 'GRAPH_NODE_TEST' },
  GRAPH_EDGE: { required: ['fromNodeId', 'toNodeId', 'type', 'source', 'confidence'], confidence: ['confidence'], normalisedType: 'GraphEdge', nodeTypes: ['GraphNode'], edgeTypes: ['GraphEdge'], evidenceType: 'GRAPH_EDGE_TEST' },
};

export function validateOutputContract(outputContract: string, payload: Record<string, unknown>): ConnectorContractValidationResult {
  const rule = outputContractRules[outputContract];
  const errors: ConnectorContractValidationResult['errors'] = [];
  const warnings: ConnectorContractValidationResult['warnings'] = [];
  if (!rule) {
    errors.push(err('UNKNOWN_OUTPUT_CONTRACT', `No validator exists for ${outputContract}`, '/outputContract', 'CRITICAL'));
  } else {
    for (const field of rule.required) if (!has(payload, field)) errors.push(err('MISSING_REQUIRED_FIELD', `${field} is required`, `/${field}`));
    for (const field of rule.arrays ?? []) if (has(payload, field) && !Array.isArray(payload[field])) errors.push(err('INVALID_ARRAY_FIELD', `${field} must be an array`, `/${field}`));
    for (const field of rule.nonNegative ?? []) if (has(payload, field) && (typeof payload[field] !== 'number' || Number(payload[field]) < 0)) errors.push(err('INVALID_NON_NEGATIVE_NUMBER', `${field} must be >= 0`, `/${field}`));
    for (const field of rule.confidence ?? []) if (has(payload, field) && (typeof payload[field] !== 'number' || Number(payload[field]) < 0 || Number(payload[field]) > 1)) errors.push(err('INVALID_CONFIDENCE', `${field} must be between 0 and 1`, `/${field}`, 'CRITICAL'));
    for (const field of rule.score ?? []) if (has(payload, field) && (typeof payload[field] !== 'number' || Number(payload[field]) < 0 || Number(payload[field]) > 100)) errors.push(err('INVALID_SCORE', `${field} must be between 0 and 100`, `/${field}`));
  }
  if (payload.edgeCase === true && !errors.length) warnings.push({ code: 'EDGE_CASE_FIXTURE', message: 'Edge-case fixture handled with warning-level attention.' });
  const status = errors.length ? 'FAIL' : warnings.length ? 'WARN' : 'PASS';
  return {
    id: id('ccv'), connectorFamily: String(payload.connectorFamily ?? 'UNKNOWN'), connectorKey: String(payload.connectorKey ?? 'UNKNOWN'), outputContract, fixtureId: String(payload.fixtureId ?? 'ad-hoc'), status, errors, warnings,
    normalisedPreview: rule && !errors.length ? { normalisedType: rule.normalisedType, source: payload.source, payload } : undefined,
    graphPreview: rule && !errors.length ? { nodeTypes: rule.nodeTypes, edgeTypes: rule.edgeTypes } : undefined,
    evidencePreview: rule && !errors.length ? { evidenceType: rule.evidenceType ?? 'NOT_REQUIRED', evidenceRef: payload.evidenceRef ? String(payload.evidenceRef) : `contract-test://${outputContract}/${payload.fixtureId ?? 'ad-hoc'}`, status: rule.evidenceType ? 'CREATED' : 'NOT_REQUIRED' } : { evidenceType: rule?.evidenceType ?? 'UNKNOWN', status: 'FAILED' },
    createdAt: now(),
  };
}
