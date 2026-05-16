export type HighRiskRoute = "CONNECTOR_SYNC"|"GRAPH_REBUILD"|"SIMULATION_CREATE"|"ARBITRATION_RUN"|"POLICY_EVALUATION"|"TELEMETRY_QUERY";
export class RateLimitPolicyService {
  private readonly limits: Record<HighRiskRoute, number> = {
    CONNECTOR_SYNC: 60,
    GRAPH_REBUILD: 20,
    SIMULATION_CREATE: 30,
    ARBITRATION_RUN: 30,
    POLICY_EVALUATION: 90,
    TELEMETRY_QUERY: 120,
  };
  limitFor(route: HighRiskRoute) { return this.limits[route]; }
}
export const rateLimitPolicyService = new RateLimitPolicyService();
