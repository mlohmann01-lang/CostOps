import type { ConnectorAdapterValidationResult } from './connector-adapter-types';
export const adapterHealthPass = (connectorKey: string): ConnectorAdapterValidationResult => ({ connectorKey, status: 'PASS', errors: [], warnings: [] });
