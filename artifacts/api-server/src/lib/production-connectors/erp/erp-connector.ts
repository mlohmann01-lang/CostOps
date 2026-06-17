import type { ProductionConnector, ProductionConnectorContext } from "../production-connector-types";
import { ERPGenericClient } from "./erp-client";
import { erpRequiredPermissions } from "./erp-auth";
import { discoverERPCapabilities } from "./erp-capabilities";
import { normaliseERPRecord } from "./erp-normaliser";
import { buildERPEvidence } from "./erp-evidence";
import { mapERPToGraph } from "./erp-graph";
export class ERPProductionConnector implements ProductionConnector { connectorKey = "erp"; connectorFamily = "ERP" as const; adapterConnectorKey = "erp"; requiredPermissions = erpRequiredPermissions; async discoverCapabilities(context: ProductionConnectorContext) { return discoverERPCapabilities({ ...context, connectorKey: this.connectorKey }); } async fetchRawRecords(context: ProductionConnectorContext) { const client = context.client instanceof ERPGenericClient ? context.client : new ERPGenericClient({ credentialRef: context.credentialRef, tokenProvider: context.tokenProvider }); return client.fetchRecords({ ...context, connectorKey: this.connectorKey }); } normalise(record: Parameters<ProductionConnector["normalise"]>[0]) { return normaliseERPRecord(this.connectorKey, record); } buildEvidence(records: Parameters<ProductionConnector["buildEvidence"]>[0], context: ProductionConnectorContext, eventType: string) { return buildERPEvidence(this.connectorKey, records, context, eventType); } mapToGraph(records: Parameters<ProductionConnector["mapToGraph"]>[0]) { return mapERPToGraph(this.connectorKey, records); } }
export function createERPProductionConnector() { return new ERPProductionConnector(); }
