import type { ProductionConnector, ProductionConnectorContext } from "../production-connector-types";
import { M365GraphClient } from "./m365-client";
import { m365RequiredPermissions } from "./m365-auth";
import { discoverM365Capabilities } from "./m365-capabilities";
import { normaliseM365Record } from "./m365-normaliser";
import { buildM365Evidence } from "./m365-evidence";
import { mapM365ToGraph } from "./m365-graph";
export class M365ProductionConnector implements ProductionConnector { connectorKey = "m365"; connectorFamily = "M365" as const; adapterConnectorKey = "m365"; requiredPermissions = m365RequiredPermissions; async discoverCapabilities(context: ProductionConnectorContext) { return discoverM365Capabilities({ ...context, connectorKey: this.connectorKey }); } async fetchRawRecords(context: ProductionConnectorContext) { const client = context.client instanceof M365GraphClient ? context.client : new M365GraphClient({ credentialRef: context.credentialRef, tokenProvider: context.tokenProvider }); return client.fetchRecords({ ...context, connectorKey: this.connectorKey }); } normalise(record: Parameters<ProductionConnector["normalise"]>[0]) { return normaliseM365Record(this.connectorKey, record); } buildEvidence(records: Parameters<ProductionConnector["buildEvidence"]>[0], context: ProductionConnectorContext, eventType: string) { return buildM365Evidence(this.connectorKey, records, context, eventType); } mapToGraph(records: Parameters<ProductionConnector["mapToGraph"]>[0]) { return mapM365ToGraph(this.connectorKey, records); } }
export function createM365ProductionConnector() { return new M365ProductionConnector(); }
