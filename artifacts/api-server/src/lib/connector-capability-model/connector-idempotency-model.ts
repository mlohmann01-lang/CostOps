import { connectorCapabilityRegistry } from './connector-capability-registry';
export const isActionIdempotent = (action: string) => connectorCapabilityRegistry.find((row) => row.action === action)?.idempotent === true;
