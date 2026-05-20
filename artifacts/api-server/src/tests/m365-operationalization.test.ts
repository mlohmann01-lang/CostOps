import test from "node:test";
import assert from "node:assert/strict";
import { M365_CONNECTOR_CAPABILITY_REGISTRY, evaluateM365ConnectorReadiness } from "../lib/connectors/m365-operationalization";

test("capability registry includes required M365 capabilities with operational metadata", () => {
  const keys = Object.keys(M365_CONNECTOR_CAPABILITY_REGISTRY);
  for (const required of ["READ_USERS", "READ_LICENSES", "READ_SIGNIN_ACTIVITY", "READ_GROUPS", "READ_SUBSCRIPTIONS", "REMOVE_LICENSE", "ASSIGN_LICENSE", "READ_AUDIT_LOGS", "READ_DIRECTORY_ROLES"]) {
    assert.equal(keys.includes(required), true);
    const capability = (M365_CONNECTOR_CAPABILITY_REGISTRY as Record<string, any>)[required];
    assert.equal(typeof capability.capabilityId, "string");
    assert.equal(Array.isArray(capability.requiredGraphScopes), true);
    assert.equal(typeof capability.minimumTenantMode, "string");
  }
});

test("readiness returns specific failure states", () => {
  assert.equal(evaluateM365ConnectorReadiness({ authSucceeded: false, tenantReachable: true, grantedScopes: [], requiredScopes: [], activityEndpointAccessible: true, licenceEndpointAccessible: true, evidenceFreshnessHours: 1, maxFreshnessHours: 24, tenantMode: "PILOT_READ_ONLY", writeCapabilitiesRequested: false }).state, "AUTH_FAILED");
  assert.equal(evaluateM365ConnectorReadiness({ authSucceeded: true, tenantReachable: false, grantedScopes: [], requiredScopes: [], activityEndpointAccessible: true, licenceEndpointAccessible: true, evidenceFreshnessHours: 1, maxFreshnessHours: 24, tenantMode: "PILOT_READ_ONLY", writeCapabilitiesRequested: false }).state, "INSUFFICIENT_PERMISSIONS");
  assert.equal(evaluateM365ConnectorReadiness({ authSucceeded: true, tenantReachable: true, grantedScopes: ["User.Read.All"], requiredScopes: ["User.Read.All", "Group.Read.All"], activityEndpointAccessible: true, licenceEndpointAccessible: true, evidenceFreshnessHours: 1, maxFreshnessHours: 24, tenantMode: "PILOT_READ_ONLY", writeCapabilitiesRequested: false }).state, "MISSING_SCOPES");
  assert.equal(evaluateM365ConnectorReadiness({ authSucceeded: true, tenantReachable: true, grantedScopes: ["User.Read.All"], requiredScopes: ["User.Read.All"], activityEndpointAccessible: true, licenceEndpointAccessible: true, evidenceFreshnessHours: 48, maxFreshnessHours: 24, tenantMode: "PILOT_READ_ONLY", writeCapabilitiesRequested: false }).state, "STALE_EVIDENCE");
  assert.equal(evaluateM365ConnectorReadiness({ authSucceeded: true, tenantReachable: true, grantedScopes: ["User.Read.All"], requiredScopes: ["User.Read.All"], activityEndpointAccessible: false, licenceEndpointAccessible: true, evidenceFreshnessHours: 2, maxFreshnessHours: 24, tenantMode: "PILOT_READ_ONLY", writeCapabilitiesRequested: false }).state, "DEGRADED");
});

test("readiness supports connected and read-only states", () => {
  const common = { authSucceeded: true, tenantReachable: true, grantedScopes: ["User.Read.All"], requiredScopes: ["User.Read.All"], activityEndpointAccessible: true, licenceEndpointAccessible: true, evidenceFreshnessHours: 2, maxFreshnessHours: 24, tenantMode: "PRODUCTION_APPROVAL_REQUIRED" };
  assert.equal(evaluateM365ConnectorReadiness({ ...common, writeCapabilitiesRequested: false }).state, "CONNECTED_READ_ONLY");
  assert.equal(evaluateM365ConnectorReadiness({ ...common, writeCapabilitiesRequested: true }).state, "CONNECTED");
});
