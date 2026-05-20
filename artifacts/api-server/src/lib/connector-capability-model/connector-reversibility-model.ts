import { connectorCapabilityRegistry } from './connector-capability-registry';
export const isActionReversible = (action: string) => connectorCapabilityRegistry.find((row) => row.action === action)?.reversible === true;
