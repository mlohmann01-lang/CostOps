import type { ProductionConnector, ProductionConnectorContext } from "../production-connector-types";
import { EntraGraphClient } from "./entra-client";
import { entraRequiredPermissions } from "./entra-auth";
import { discoverEntraCapabilities } from "./entra-capabilities";
import { normaliseEntraRecord } from "./entra-normaliser";
import { buildEntraEvidence } from "./entra-evidence";
import { mapEntraToGraph } from "./entra-graph";
export class EntraProductionConnector implements ProductionConnector { connectorKey = "entra-id"; connectorFamily = "ENTRA_ID" as const; adapterConnectorKey = "entra-id"; requiredPermissions = entraRequiredPermissions; async discoverCapabilities(context: ProductionConnectorContext) { return discoverEntraCapabilities({ ...context, connectorKey: this.connectorKey }); } async fetchRawRecords(context: ProductionConnectorContext) { const client = context.client instanceof EntraGraphClient ? context.client : new EntraGraphClient({ credentialRef: context.credentialRef, tokenProvider: context.tokenProvider }); return client.fetchRecords({ ...context, connectorKey: this.connectorKey }); } normalise(record: Parameters<ProductionConnector["normalise"]>[0]) { return normaliseEntraRecord(this.connectorKey, record); } buildEvidence(records: Parameters<ProductionConnector["buildEvidence"]>[0], context: ProductionConnectorContext, eventType: string) { return buildEntraEvidence(this.connectorKey, records, context, eventType); } mapToGraph(records: Parameters<ProductionConnector["mapToGraph"]>[0]) { return mapEntraToGraph(this.connectorKey, records); } }
export function createEntraProductionConnector() { return new EntraProductionConnector(); }
