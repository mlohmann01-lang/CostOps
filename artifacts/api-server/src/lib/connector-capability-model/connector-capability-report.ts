import { connectorCapabilityRegistry } from './connector-capability-registry';
export const buildConnectorCapabilityReport = () => ({ totalActions: connectorCapabilityRegistry.length, deterministic: true });
