import { connectorCapabilityRegistry } from './connector-capability-registry';
export const getPermissionScope = (action: string) => connectorCapabilityRegistry.find((row) => row.action === action)?.permissionScope;
