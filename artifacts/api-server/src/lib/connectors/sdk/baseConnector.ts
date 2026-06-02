import type { ConnectorProvider, ConnectorCapability, ConnectorContext, ConnectorReadinessResult, ConnectorDiscoveryResult, ConnectorTrustResult, ConnectorDryRunResult, ConnectorExecutionResult, ConnectorVerificationResult, ConnectorEvidenceResult } from './connectorTypes'

export abstract class BaseConnector {
  abstract provider: ConnectorProvider
  abstract capabilities: ConnectorCapability[]

  abstract checkReadiness(context: ConnectorContext): Promise<ConnectorReadinessResult>
  abstract discover(context: ConnectorContext): Promise<ConnectorDiscoveryResult>
  abstract evaluateTrust(context: ConnectorContext): Promise<ConnectorTrustResult>
  abstract dryRunAction(context: ConnectorContext, action: unknown): Promise<ConnectorDryRunResult>
  abstract executeAction(context: ConnectorContext, action: unknown): Promise<ConnectorExecutionResult>
  abstract verifyAction(context: ConnectorContext, actionId: string): Promise<ConnectorVerificationResult>
  abstract captureEvidence(context: ConnectorContext, actionId?: string): Promise<ConnectorEvidenceResult>
}
