import { BaseConnector } from './baseConnector'
import { connectorRegistry } from './connectorRegistry'
import type { ConnectorCapability, ConnectorContext, ConnectorDiscoveryResult, ConnectorDryRunResult, ConnectorEvidenceResult, ConnectorExecutionResult, ConnectorProvider, ConnectorReadinessResult, ConnectorTrustResult, ConnectorVerificationResult } from './connectorTypes'

const now = () => new Date().toISOString()
const actionIdFor = (action: unknown) => String((action as any)?.actionId ?? (action as any)?.id ?? 'mock-action-1')

export class MockConnector extends BaseConnector {
  provider: ConnectorProvider = 'MOCK'
  capabilities: ConnectorCapability[] = ['AUTH', 'READINESS_CHECK', 'DISCOVERY', 'TRUST_SCORING', 'OPPORTUNITY_GENERATION', 'DRY_RUN', 'EXECUTION', 'VERIFICATION', 'EVIDENCE_CAPTURE']

  async checkReadiness(context: ConnectorContext): Promise<ConnectorReadinessResult> {
    return { provider: this.provider, tenantId: context.tenantId, status: 'READY', blockers: [], warnings: [], capabilities: this.capabilities, checkedAt: now() }
  }

  async discover(context: ConnectorContext): Promise<ConnectorDiscoveryResult> {
    const rawEntities = [
      { id: 'mock-user-1', type: 'USER', monthlyCost: 42 },
      { id: 'mock-license-1', type: 'LICENSE', assigned: true },
      { id: 'mock-workload-1', type: 'WORKLOAD', utilization: 0.32 },
    ]
    return { provider: this.provider, tenantId: context.tenantId, entitiesDiscovered: rawEntities.length, rawEntities, normalizedEntities: rawEntities.map((entity) => ({ ...entity, provider: this.provider, tenantId: context.tenantId })), evidenceRefs: rawEntities.map((entity) => `mock:evidence:${entity.id}`), discoveredAt: now() }
  }

  async evaluateTrust(context: ConnectorContext): Promise<ConnectorTrustResult> {
    return { provider: this.provider, tenantId: context.tenantId, trustScore: 92, trustBand: 'HIGH', reasons: ['Mock readiness is deterministic', 'Mock discovery returns normalized evidence', 'Mock connector is safe for SDK contract tests'], evaluatedAt: now() }
  }

  async dryRunAction(context: ConnectorContext, action: unknown): Promise<ConnectorDryRunResult> {
    return { provider: this.provider, tenantId: context.tenantId, actionId: actionIdFor(action), safeToExecute: true, blockers: [], warnings: [], estimatedImpact: { projectedMonthlySavings: 42, blastRadius: 'MOCK_ONLY' } }
  }

  async executeAction(context: ConnectorContext, action: unknown): Promise<ConnectorExecutionResult> {
    const actionId = actionIdFor(action)
    return { provider: this.provider, tenantId: context.tenantId, actionId, status: 'EXECUTED', beforeState: { enabled: true, assigned: true }, afterState: { enabled: true, assigned: false }, evidenceRefs: [`mock:execution:${actionId}`], executedAt: now() }
  }

  async verifyAction(context: ConnectorContext, actionId: string): Promise<ConnectorVerificationResult> {
    return { provider: this.provider, tenantId: context.tenantId, actionId, verified: true, verificationEvidence: [{ evidenceRef: `mock:verification:${actionId}`, state: 'AFTER_STATE_CONFIRMED' }], verifiedAt: now() }
  }

  async captureEvidence(context: ConnectorContext, actionId?: string): Promise<ConnectorEvidenceResult> {
    const suffix = actionId ?? 'tenant'
    return { provider: this.provider, tenantId: context.tenantId, evidencePackId: `mock-evidence-pack-${context.tenantId}-${suffix}`, evidenceItems: [{ evidenceRef: `mock:evidence-pack:${suffix}`, provider: this.provider, tenantId: context.tenantId, stage: 'EVIDENCE' }], createdAt: now() }
  }
}

export function registerMockConnector() {
  if (!connectorRegistry.has('MOCK')) connectorRegistry.register(new MockConnector())
}
