/**
 * Proof Graph Integration (Part 10)
 *
 * 7 node types for proof graph representing OpenAI connector as evidence source.
 * No secrets, only IDs and metadata.
 */

export type ProofGraphNodeType =
  | 'CONNECTOR_SOURCE'
  | 'CONNECTOR_CAPABILITY'
  | 'TELEMETRY_BATCH'
  | 'NORMALIZED_EVENT'
  | 'RECOMMENDATION'
  | 'COST_ATTRIBUTION'
  | 'DRIFT_SIGNAL';

export type ProofGraphNode = {
  nodeId: string;
  nodeType: ProofGraphNodeType;
  label: string;
  timestamp: string;
  properties: Record<string, unknown>;
  parents?: string[]; // Node IDs of parent nodes
};

export type ProofGraphEdge = {
  fromNodeId: string;
  toNodeId: string;
  edgeType: 'DERIVES_FROM' | 'SUPPORTS' | 'CONTRADICTS' | 'TRIGGERS' | 'AGGREGATES';
  metadata?: Record<string, unknown>;
};

/**
 * Proof graph builder for OpenAI connector
 */
export class OpenAIProofGraphBuilder {
  /**
   * Build connector source node
   * (Type 1: CONNECTOR_SOURCE)
   */
  buildConnectorSourceNode(): ProofGraphNode {
    return {
      nodeId: 'connector-openai-source',
      nodeType: 'CONNECTOR_SOURCE',
      label: 'OpenAI Admin API',
      timestamp: new Date().toISOString(),
      properties: {
        connectorId: 'OPENAI',
        apiVersion: '1.0',
        dataQuality: 'REAL',
        readOnly: true,
        authenticationType: 'BEARER_TOKEN',
      },
    };
  }

  /**
   * Build capability nodes
   * (Type 2: CONNECTOR_CAPABILITY)
   */
  buildCapabilityNodes(capabilities: string[]): ProofGraphNode[] {
    return capabilities.map((cap) => ({
      nodeId: `connector-openai-capability-${cap.toLowerCase()}`,
      nodeType: 'CONNECTOR_CAPABILITY',
      label: `OpenAI Capability: ${cap}`,
      timestamp: new Date().toISOString(),
      parents: ['connector-openai-source'],
      properties: {
        capability: cap,
        state: 'READY',
        description: this.getCapabilityDescription(cap),
      },
    }));
  }

  /**
   * Build telemetry batch node
   * (Type 3: TELEMETRY_BATCH)
   */
  buildTelemetryBatchNode(
    batchId: string,
    tenantId: string,
    eventCount: number,
    periodStart: string,
    periodEnd: string,
  ): ProofGraphNode {
    return {
      nodeId: `telemetry-batch-${batchId}`,
      nodeType: 'TELEMETRY_BATCH',
      label: `OpenAI Telemetry Batch ${batchId.substring(0, 8)}`,
      timestamp: new Date().toISOString(),
      parents: ['connector-openai-source'],
      properties: {
        batchId,
        tenantId,
        eventCount,
        periodStart,
        periodEnd,
        dataComplete: true,
      },
    };
  }

  /**
   * Build normalized event nodes
   * (Type 4: NORMALIZED_EVENT)
   */
  buildNormalizedEventNodes(
    batchId: string,
    eventIds: string[],
    sampleEventCount: number = 3,
  ): ProofGraphNode[] {
    // For large batches, sample to avoid graph explosion
    const sampleIds = eventIds.slice(0, sampleEventCount);
    return sampleIds.map((eventId, index) => ({
      nodeId: `normalized-event-${eventId}`,
      nodeType: 'NORMALIZED_EVENT',
      label: `Normalized Event ${index + 1}/${eventIds.length}`,
      timestamp: new Date().toISOString(),
      parents: [`telemetry-batch-${batchId}`],
      properties: {
        eventId,
        position: index,
        totalInBatch: eventIds.length,
        sourceOfTruth: 'CONNECTOR',
      },
    }));
  }

  /**
   * Build recommendation nodes
   * (Type 5: RECOMMENDATION)
   */
  buildRecommendationNodes(
    recommendations: Array<{
      id: string;
      type: string;
      severity: string;
      estimatedSavings: number;
    }>,
  ): ProofGraphNode[] {
    return recommendations.map((rec) => ({
      nodeId: `recommendation-${rec.id}`,
      nodeType: 'RECOMMENDATION',
      label: `${rec.type}: ${rec.id.substring(0, 12)}`,
      timestamp: new Date().toISOString(),
      properties: {
        recommendationId: rec.id,
        type: rec.type,
        severity: rec.severity,
        estimatedMonthlySavings: rec.estimatedSavings,
      },
    }));
  }

  /**
   * Build cost attribution node
   * (Type 6: COST_ATTRIBUTION)
   */
  buildCostAttributionNode(
    tenantId: string,
    totalCostUSD: number,
    byModel: Record<string, number>,
    byUser: Record<string, number>,
  ): ProofGraphNode {
    return {
      nodeId: `cost-attribution-${tenantId}-${Date.now()}`,
      nodeType: 'COST_ATTRIBUTION',
      label: 'Cost Attribution Summary',
      timestamp: new Date().toISOString(),
      properties: {
        tenantId,
        totalCostUSD,
        modelCount: Object.keys(byModel).length,
        userCount: Object.keys(byUser).length,
        topModel: Object.entries(byModel).sort(([, a], [, b]) => b - a)[0]?.[0],
        topUser: Object.entries(byUser).sort(([, a], [, b]) => b - a)[0]?.[0],
      },
    };
  }

  /**
   * Build drift signal node
   * (Type 7: DRIFT_SIGNAL)
   */
  buildDriftSignalNode(
    tenantId: string,
    driftType: string,
    currentValue: number,
    previousValue: number,
    severity: string,
  ): ProofGraphNode {
    return {
      nodeId: `drift-signal-${tenantId}-${driftType}-${Date.now()}`,
      nodeType: 'DRIFT_SIGNAL',
      label: `Drift Detected: ${driftType}`,
      timestamp: new Date().toISOString(),
      properties: {
        tenantId,
        driftType,
        currentValue,
        previousValue,
        percentageChange: previousValue > 0 ? ((currentValue - previousValue) / previousValue) * 100 : 0,
        severity,
      },
    };
  }

  /**
   * Build edges connecting nodes (no secrets, only IDs)
   */
  buildEdges(
    sourceNodeId: string,
    targetNodeIds: string[],
    edgeType: ProofGraphEdge['edgeType'],
  ): ProofGraphEdge[] {
    return targetNodeIds.map((targetId) => ({
      fromNodeId: sourceNodeId,
      toNodeId: targetId,
      edgeType,
    }));
  }

  /**
   * Get friendly description for a capability
   */
  private getCapabilityDescription(cap: string): string {
    const descriptions: Record<string, string> = {
      CREDENTIAL_VALIDATION: 'Validates OpenAI API credentials',
      USAGE_DATA_READ: 'Reads token usage data from OpenAI Admin API',
      COST_DATA_READ: 'Reads billing cost data from OpenAI Admin API',
      PROJECT_ATTRIBUTION: 'Attributes costs to OpenAI projects',
      USER_ATTRIBUTION: 'Attributes costs to OpenAI users',
      BILLING_PERIOD_SYNC: 'Syncs billing periods and reconciliations',
    };
    return descriptions[cap] || 'Unknown capability';
  }

  /**
   * Build complete proof graph for a sync run
   */
  buildCompleteProofGraph(
    batchId: string,
    tenantId: string,
    eventIds: string[],
    recommendations: Array<{ id: string; type: string; severity: string; estimatedSavings: number }>,
    totalCostUSD: number,
    byModel: Record<string, number>,
    byUser: Record<string, number>,
  ): { nodes: ProofGraphNode[]; edges: ProofGraphEdge[] } {
    const nodes: ProofGraphNode[] = [];
    const edges: ProofGraphEdge[] = [];

    // Add connector source
    const sourceNode = this.buildConnectorSourceNode();
    nodes.push(sourceNode);

    // Add capabilities
    const capabilityNodes = this.buildCapabilityNodes([
      'CREDENTIAL_VALIDATION',
      'USAGE_DATA_READ',
      'COST_DATA_READ',
      'PROJECT_ATTRIBUTION',
      'USER_ATTRIBUTION',
    ]);
    nodes.push(...capabilityNodes);

    // Add telemetry batch
    const batchNode = this.buildTelemetryBatchNode(batchId, tenantId, eventIds.length, new Date().toISOString(), new Date().toISOString());
    nodes.push(batchNode);

    // Add normalized event sample
    const eventNodes = this.buildNormalizedEventNodes(batchId, eventIds);
    nodes.push(...eventNodes);

    // Add recommendations
    const recNodes = this.buildRecommendationNodes(recommendations);
    nodes.push(...recNodes);

    // Add cost attribution
    const costNode = this.buildCostAttributionNode(tenantId, totalCostUSD, byModel, byUser);
    nodes.push(costNode);

    // Build edges
    edges.push(
      ...this.buildEdges(sourceNode.nodeId, capabilityNodes.map((n) => n.nodeId), 'AGGREGATES'),
      ...this.buildEdges(sourceNode.nodeId, [batchNode.nodeId], 'DERIVES_FROM'),
      ...this.buildEdges(batchNode.nodeId, eventNodes.map((n) => n.nodeId), 'AGGREGATES'),
      ...this.buildEdges(batchNode.nodeId, [costNode.nodeId], 'TRIGGERS'),
      ...this.buildEdges(costNode.nodeId, recNodes.map((n) => n.nodeId), 'TRIGGERS'),
    );

    return { nodes, edges };
  }
}

export const openaiProofGraphBuilder = new OpenAIProofGraphBuilder();
