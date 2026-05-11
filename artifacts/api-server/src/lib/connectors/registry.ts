import { ingestM365Tenant } from "./m365-ingestion";
import { CONNECTOR_CAPABILITIES, ConnectorRegistry } from "./sdk";

export function buildConnectorRegistry() {
  const registry = new ConnectorRegistry();

  registry.register({
    id: "M365_GRAPH",
    capabilities: CONNECTOR_CAPABILITIES,
    runSync: ingestM365Tenant,
  });

  return registry;
}
