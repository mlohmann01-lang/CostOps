import type { ConnectorRealityEntry } from './platform-audit-types';

/**
 * Sprint 8, Workstream 1: ground-truth classification of each connector's
 * Discovery / Execution / Verification / Protection capability. This is an
 * audit-only registry -- it does not change any connector behaviour.
 *
 * "LIVE" means the path calls a real external provider API. "MOCK" means the
 * path mutates in-memory/local state to simulate the provider rather than
 * calling it (e.g. AWS/Azure/Snowflake/Databricks "controlled execution"
 * scaffolding) -- this is deliberately not credited as LIVE even though the
 * surrounding policy/test scaffolding is real and well-tested.
 */
export const connectorRealityAudit: ConnectorRealityEntry[] = [
  {
    connector: 'M365',
    discovery: 'LIVE',
    execution: 'LIVE',
    verification: 'LIVE',
    protection: 'PARTIAL',
    notes: 'Most mature connector: real Graph API discovery, real license/seat execution, real finance-verified outcome reconciliation. Protection (drift policy) exists but coverage is narrower than discovery.',
  },
  {
    connector: 'Flexera',
    discovery: 'LIVE',
    execution: 'PARTIAL',
    verification: 'PARTIAL',
    protection: 'PARTIAL',
    notes: 'Real ingestion of Flexera asset/spend data; execution and verification rely partly on inferred (string-matched) linkage rather than confirmed FK chains back to Flexera entities.',
  },
  {
    connector: 'ServiceNow',
    discovery: 'PARTIAL',
    execution: 'MOCK',
    verification: 'MOCK',
    protection: 'STUB',
    notes: 'Discovery reads real ServiceNow CMDB/ticket data in supported paths; execution and verification are simulated against local state; protection scaffolding is largely unbuilt.',
  },
  {
    connector: 'AWS',
    discovery: 'PARTIAL',
    execution: 'MOCK',
    verification: 'MOCK',
    protection: 'PARTIAL',
    notes: 'Discovery can read real account/resource metadata where wired; execution is in-memory "controlled execution" state mutation, not real AWS API calls. Verification and the resulting economic-outcome/drift-policy records are real internal records, but they verify a simulated action, not a real one.',
  },
  {
    connector: 'Azure',
    discovery: 'PARTIAL',
    execution: 'MOCK',
    verification: 'MOCK',
    protection: 'PARTIAL',
    notes: 'Same pattern as AWS: in-memory controlled-execution simulation rather than real Azure Resource Manager calls.',
  },
  {
    connector: 'Snowflake',
    discovery: 'PARTIAL',
    execution: 'MOCK',
    verification: 'MOCK',
    protection: 'PARTIAL',
    notes: 'Same pattern as AWS/Azure: simulated warehouse/credit actions, not real Snowflake API calls.',
  },
  {
    connector: 'Databricks',
    discovery: 'PARTIAL',
    execution: 'MOCK',
    verification: 'MOCK',
    protection: 'PARTIAL',
    notes: 'Same pattern as AWS/Azure/Snowflake: simulated cluster/job actions, not real Databricks API calls.',
  },
  {
    connector: 'AI Providers',
    discovery: 'LIVE',
    execution: 'NOT_SUPPORTED',
    verification: 'PARTIAL',
    protection: 'STUB',
    notes: 'Usage/spend discovery against real provider billing APIs where configured; these connectors are spend-observability only, not action-execution targets, so execution is NOT_SUPPORTED rather than MOCK.',
  },
  {
    connector: 'Technology Portfolio',
    discovery: 'LIVE',
    execution: 'NOT_SUPPORTED',
    verification: 'LIVE',
    protection: 'PARTIAL',
    notes: 'Aggregation layer over other connectors\' real discovery and verification data rather than its own external source; not an execution target itself.',
  },
];

export function connectorReality(connector: string): ConnectorRealityEntry | undefined {
  return connectorRealityAudit.find((entry) => entry.connector === connector);
}
