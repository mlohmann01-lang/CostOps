import { connectorCapabilityRegistry } from './connector-capability-registry';
export const getActionCapability = (action: string) => connectorCapabilityRegistry.find((row) => row.action === action)?.capability ?? 'NEVER_ALLOWED';
