import type { ProductionConnector, ProductionConnectorContext } from "../production-connector-types";
import { ServiceNowClient } from "./servicenow-client";
import { serviceNowRequiredPermissions } from "./servicenow-auth";
import { discoverServiceNowCapabilities } from "./servicenow-capabilities";
import { normaliseServiceNowRecord } from "./servicenow-normaliser";
import { buildServiceNowEvidence } from "./servicenow-evidence";
import { mapServiceNowToGraph } from "./servicenow-graph";
export class ServiceNowProductionConnector implements ProductionConnector { connectorKey = "servicenow"; connectorFamily = "SERVICENOW" as const; adapterConnectorKey = "servicenow"; requiredPermissions = serviceNowRequiredPermissions; async discoverCapabilities(context: ProductionConnectorContext) { return discoverServiceNowCapabilities({ ...context, connectorKey: this.connectorKey }); } async fetchRawRecords(context: ProductionConnectorContext) { const client = context.client instanceof ServiceNowClient ? context.client : new ServiceNowClient({ credentialRef: context.credentialRef, tokenProvider: context.tokenProvider }); return client.fetchRecords({ ...context, connectorKey: this.connectorKey }); } normalise(record: Parameters<ProductionConnector["normalise"]>[0]) { return normaliseServiceNowRecord(this.connectorKey, record); } buildEvidence(records: Parameters<ProductionConnector["buildEvidence"]>[0], context: ProductionConnectorContext, eventType: string) { return buildServiceNowEvidence(this.connectorKey, records, context, eventType); } mapToGraph(records: Parameters<ProductionConnector["mapToGraph"]>[0]) { return mapServiceNowToGraph(this.connectorKey, records); } }
export function createServiceNowProductionConnector() { return new ServiceNowProductionConnector(); }
