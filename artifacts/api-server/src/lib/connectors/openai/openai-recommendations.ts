/**
 * Recommendations From OpenAI Telemetry (Part 9)
 *
 * Generates actionable recommendations from real OpenAI cost data:
 * - Token governance (overspend detection, prompt compression)
 * - Model routing (cheaper model opportunities)
 * - Drift detection (cost explosion, unauthorized models)
 * - ROI analysis (cost per outcome)
 */

import type { NormalizedAITelemetryEvent } from '../../ai-telemetry-types.js';

export type RecommendationType = 'TOKEN_GOVERNANCE' | 'MODEL_ROUTING' | 'DRIFT_ALERT' | 'ROI_ANALYSIS';

export type RecommendationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type Recommendation = {
  id: string;
  tenantId: string;
  type: RecommendationType;
  severity: RecommendationSeverity;
  title: string;
  description: string;
  estimatedMonthlySavings: number;
  actionableSteps: string[];
  evidence: {
    metric: string;
    currentValue: number | string;
    threshold: number | string;
    variance: number; // percentage difference from threshold
  };
  affectedResources: {
    modelId?: string;
    userId?: string;
    workflowId?: string;
  };
  generatedAt: string;
  expiresAt: string;
};

/**
 * Recommendation engine for OpenAI telemetry
 */
export class OpenAIRecommendationEngine {
  /**
   * Generate recommendations from normalized telemetry events
   */
  generateRecommendations(tenantId: string, events: NormalizedAITelemetryEvent[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Token governance recommendations
    recommendations.push(...this.detectTokenOverspend(tenantId, events));

    // Model routing recommendations
    recommendations.push(...this.detectModelRoutingOpportunities(tenantId, events));

    // Drift detection
    recommendations.push(...this.detectCostDrift(tenantId, events));

    // ROI analysis
    recommendations.push(...this.analyzeROI(tenantId, events));

    return recommendations;
  }

  /**
   * Detect token overspend and recommend prompt compression
   */
  private detectTokenOverspend(tenantId: string, events: NormalizedAITelemetryEvent[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Calculate token burn rate
    const totalInputTokens = events.reduce((sum, e) => sum + (e.inputTokens || 0), 0);
    const totalOutputTokens = events.reduce((sum, e) => sum + (e.outputTokens || 0), 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    const avgOutputRatio = totalTokens > 0 ? totalOutputTokens / totalTokens : 0;

    // If output ratio > 40%, suggests verbose responses or context carrying
    if (avgOutputRatio > 0.4) {
      recommendations.push({
        id: `rec-token-overspend-${tenantId}-${Date.now()}`,
        tenantId,
        type: 'TOKEN_GOVERNANCE',
        severity: 'HIGH',
        title: 'High Output Token Ratio Detected',
        description: 'Output tokens represent >40% of total tokens, suggesting verbose responses or context carrying.',
        estimatedMonthlySavings: (totalTokens * 0.0005) * 0.25, // Estimate 25% reduction
        actionableSteps: [
          'Implement prompt compression techniques',
          'Use system prompts to enforce conciseness',
          'Truncate conversation history in long chains',
          'Cache common response patterns',
        ],
        evidence: {
          metric: 'Output Token Ratio',
          currentValue: (avgOutputRatio * 100).toFixed(1) + '%',
          threshold: '40%',
          variance: ((avgOutputRatio - 0.4) / 0.4) * 100,
        },
        affectedResources: {},
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return recommendations;
  }

  /**
   * Detect model routing opportunities (expensive models used for simple tasks)
   */
  private detectModelRoutingOpportunities(tenantId: string, events: NormalizedAITelemetryEvent[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Group by model and analyze
    const byModel = new Map<string, NormalizedAITelemetryEvent[]>();
    for (const event of events) {
      const modelId = event.modelId || 'unknown';
      if (!byModel.has(modelId)) {
        byModel.set(modelId, []);
      }
      byModel.get(modelId)!.push(event);
    }

    // Detect expensive models (GPT-4 variants) with low complexity
    const expensiveModels = ['gpt-4', 'gpt-4-turbo', 'gpt-4o'];
    for (const [model, modelEvents] of byModel) {
      const isExpensive = expensiveModels.some((exp) => model.includes(exp.toLowerCase()));
      if (!isExpensive) continue;

      // Calculate average tokens per request
      const avgInputTokens = modelEvents.reduce((sum, e) => sum + (e.inputTokens || 0), 0) / modelEvents.length;

      // If avg input < 100 tokens, likely simple task (good candidate for cheaper model)
      if (avgInputTokens < 100) {
        const monthlySavings = modelEvents.length * avgInputTokens * 0.0003; // Rough estimate
        recommendations.push({
          id: `rec-model-routing-${tenantId}-${model}-${Date.now()}`,
          tenantId,
          type: 'MODEL_ROUTING',
          severity: 'MEDIUM',
          title: `Downgrade Opportunity: ${model} for Simple Tasks`,
          description: `Model ${model} is handling simple requests (<100 input tokens avg). Consider routing to gpt-3.5-turbo or gpt-4o-mini.`,
          estimatedMonthlySavings: monthlySavings,
          actionableSteps: [
            `Implement task complexity classifier`,
            `Route requests <100 tokens to cheaper tier`,
            `Monitor quality metrics after downgrade`,
            `Apply to ${modelEvents.length} total requests`,
          ],
          evidence: {
            metric: 'Average Input Tokens',
            currentValue: avgInputTokens.toFixed(0),
            threshold: '100',
            variance: ((avgInputTokens - 100) / 100) * 100,
          },
          affectedResources: { modelId: model },
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    return recommendations;
  }

  /**
   * Detect cost drift (sudden spikes, trending increases)
   */
  private detectCostDrift(tenantId: string, events: NormalizedAITelemetryEvent[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Calculate total cost and token burn
    const totalCost = events.reduce((sum, e) => sum + (e.costUSD || 0), 0);
    const totalTokens = events.reduce((sum, e) => sum + (e.inputTokens || 0) + (e.outputTokens || 0), 0);

    // Estimate cost per 1M tokens
    const costPer1MTokens = totalTokens > 0 ? (totalCost / totalTokens) * 1_000_000 : 0;

    // If cost is trending high (>$2/1M tokens for GPT-3.5), flag it
    if (costPer1MTokens > 2.0) {
      recommendations.push({
        id: `rec-drift-${tenantId}-${Date.now()}`,
        tenantId,
        type: 'DRIFT_ALERT',
        severity: 'HIGH',
        title: 'Cost Per Token Trending High',
        description: `Cost per million tokens is $${costPer1MTokens.toFixed(2)}, suggesting use of expensive models or inefficient routing.`,
        estimatedMonthlySavings: totalCost * 0.15, // Estimate 15% reduction
        actionableSteps: [
          'Audit model selection in workflows',
          'Check for expensive model usage (GPT-4, Claude Opus)',
          'Implement router enforcement',
          'Review for accidental expensive model defaults',
        ],
        evidence: {
          metric: 'Cost Per 1M Tokens (USD)',
          currentValue: costPer1MTokens.toFixed(2),
          threshold: '2.0',
          variance: ((costPer1MTokens - 2.0) / 2.0) * 100,
        },
        affectedResources: {},
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }

    return recommendations;
  }

  /**
   * Analyze ROI (cost per outcome, realized vs estimated)
   */
  private analyzeROI(tenantId: string, events: NormalizedAITelemetryEvent[]): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Group by workflow to estimate ROI
    const byWorkflow = new Map<string, NormalizedAITelemetryEvent[]>();
    for (const event of events) {
      const workflowId = event.workflowId || 'unattributed';
      if (!byWorkflow.has(workflowId)) {
        byWorkflow.set(workflowId, []);
      }
      byWorkflow.get(workflowId)!.push(event);
    }

    // For workflows with high volume, estimate cost per outcome
    for (const [workflow, workflowEvents] of byWorkflow) {
      if (workflow === 'unattributed' || workflowEvents.length < 10) continue;

      const totalCost = workflowEvents.reduce((sum, e) => sum + (e.costUSD || 0), 0);
      const costPerRun = totalCost / workflowEvents.length;

      // Flag if cost per run is high (>$0.10)
      if (costPerRun > 0.1) {
        recommendations.push({
          id: `rec-roi-${tenantId}-${workflow}-${Date.now()}`,
          tenantId,
          type: 'ROI_ANALYSIS',
          severity: 'MEDIUM',
          title: `High Cost Per Outcome: ${workflow}`,
          description: `Workflow ${workflow} costs $${costPerRun.toFixed(4)} per execution. Consider optimizing prompt or model selection.`,
          estimatedMonthlySavings: costPerRun * 0.25 * 30, // Estimate 25% reduction
          actionableSteps: [
            `Analyze outcome quality vs cost`,
            `Implement caching for repeated inputs`,
            `Use cheaper model variant if quality acceptable`,
            `Batch process if possible`,
          ],
          evidence: {
            metric: 'Cost Per Outcome (USD)',
            currentValue: costPerRun.toFixed(4),
            threshold: '0.1',
            variance: ((costPerRun - 0.1) / 0.1) * 100,
          },
          affectedResources: { workflowId: workflow },
          generatedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }
    }

    return recommendations;
  }
}

export const openaiRecommendationEngine = new OpenAIRecommendationEngine();
