import type { ProductionConnector, ProductionConnectorContext } from "../production-connector-types";
import { FlexeraClient } from "./flexera-client";
import { flexeraRequiredPermissions } from "./flexera-auth";
import { discoverFlexeraCapabilities } from "./flexera-capabilities";
import { normaliseFlexeraRecord } from "./flexera-normaliser";
import { buildFlexeraEvidence } from "./flexera-evidence";
import { mapFlexeraToGraph } from "./flexera-graph";
export class FlexeraProductionConnector implements ProductionConnector { connectorKey = "flexera"; connectorFamily = "FLEXERA" as const; adapterConnectorKey = "flexera"; requiredPermissions = flexeraRequiredPermissions; async discoverCapabilities(context: ProductionConnectorContext) { return discoverFlexeraCapabilities({ ...context, connectorKey: this.connectorKey }); } async fetchRawRecords(context: ProductionConnectorContext) { const client = context.client instanceof FlexeraClient ? context.client : new FlexeraClient({ credentialRef: context.credentialRef, tokenProvider: context.tokenProvider }); return client.fetchRecords({ ...context, connectorKey: this.connectorKey }); } normalise(record: Parameters<ProductionConnector["normalise"]>[0]) { return normaliseFlexeraRecord(this.connectorKey, record); } buildEvidence(records: Parameters<ProductionConnector["buildEvidence"]>[0], context: ProductionConnectorContext, eventType: string) { return buildFlexeraEvidence(this.connectorKey, records, context, eventType); } mapToGraph(records: Parameters<ProductionConnector["mapToGraph"]>[0]) { return mapFlexeraToGraph(this.connectorKey, records); } }
export function createFlexeraProductionConnector() { return new FlexeraProductionConnector(); }
