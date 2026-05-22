/**
 * Savings Verification Service (Sprint D, Part 4)
 *
 * Tracks baseline costs before downgrade, measures post-downgrade costs,
 * calculates realized savings, and integrates with proof graph.
 */

import { modelDowngradeExecutor } from './model-downgrade-execution.js';
import { logger } from '../logger.js';

export type BasellineMeasurement = {
  measurementId: string;
  executionId: string;
  tenantId: string;
  fromModel: string;
  measuredAt: string;
  windowDays: number;
  totalTokens: number;
  totalCostUSD: number;
  costPerToken: number;
};

export type SavingsVerification = {
  verificationId: string;
  executionId: string;
  tenantId: string;
  fromModel: string;
  toModel: string;
  baselineTokens: number;
  baselineCostUSD: number;
  measuredTokens: number;
  measuredCostUSD: number;
  realizedSavingsUSD: number;
  realizedSavingsPercent: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'INCONCLUSIVE';
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  startedAt: string;
  completedAt?: string;
  proofGraphNodeId?: string;
};

/**
 * Savings verification service
 */
export class SavingsVerificationService {
  private baselines: Map<string, BasellineMeasurement> = new Map();
  private verifications: Map<string, SavingsVerification> = new Map();

  /**
   * Record baseline measurement before downgrade
   */
  recordBaseline(
    executionId: string,
    tenantId: string,
    fromModel: string,
    windowDays: number,
    totalTokens: number,
    totalCostUSD: number,
  ): BasellineMeasurement {
    const baseline: BasellineMeasurement = {
      measurementId: `baseline-${executionId}-${Date.now()}`,
      executionId,
      tenantId,
      fromModel,
      measuredAt: new Date().toISOString(),
      windowDays,
      totalTokens,
      totalCostUSD,
      costPerToken: totalCostUSD / (totalTokens || 1),
    };

    this.baselines.set(baseline.measurementId, baseline);

    logger.info(
      {
        executionId,
        fromModel,
        totalTokens,
        totalCostUSD: totalCostUSD.toFixed(2),
        windowDays,
        component: 'savings-verification',
      },
      'Baseline measurement recorded',
    );

    return baseline;
  }

  /**
   * Create verification record from an execution
   */
  initializeVerification(executionId: string): SavingsVerification | undefined {
    const execution = modelDowngradeExecutor.getExecution(executionId);
    if (!execution || execution.status !== 'EXECUTED') {
      return undefined;
    }

    const baseline = Array.from(this.baselines.values()).find((b) => b.executionId === executionId);
    if (!baseline) {
      return undefined;
    }

    const verification: SavingsVerification = {
      verificationId: `verify-${executionId}-${Date.now()}`,
      executionId,
      tenantId: execution.tenantId,
      fromModel: execution.fromModel,
      toModel: execution.toModel,
      baselineTokens: baseline.totalTokens,
      baselineCostUSD: baseline.totalCostUSD,
      measuredTokens: 0,
      measuredCostUSD: 0,
      realizedSavingsUSD: 0,
      realizedSavingsPercent: 0,
      status: 'PENDING',
      confidenceLevel: 'LOW',
      startedAt: new Date().toISOString(),
    };

    this.verifications.set(verification.verificationId, verification);
    return verification;
  }

  /**
   * Record measured cost after downgrade window
   */
  recordMeasurement(
    verificationId: string,
    totalTokens: number,
    totalCostUSD: number,
  ): SavingsVerification | undefined {
    const verification = this.verifications.get(verificationId);
    if (!verification) {
      return undefined;
    }

    verification.status = 'IN_PROGRESS';
    verification.measuredTokens = totalTokens;
    verification.measuredCostUSD = totalCostUSD;

    // Calculate realized savings
    const costSavings = verification.baselineCostUSD - totalCostUSD;
    const tokenReduction = verification.baselineTokens - totalTokens;

    verification.realizedSavingsUSD = Math.max(0, costSavings);
    verification.realizedSavingsPercent = verification.baselineCostUSD > 0 ? (costSavings / verification.baselineCostUSD) * 100 : 0;

    // Assess confidence
    if (tokenReduction < 0) {
      // More tokens used — probably not a clean comparison (e.g., different workflow load)
      verification.confidenceLevel = 'LOW';
      verification.status = 'INCONCLUSIVE';
    } else if (verification.realizedSavingsPercent >= 15) {
      // Clear savings (>15%)
      verification.confidenceLevel = 'HIGH';
    } else if (verification.realizedSavingsPercent >= 5) {
      // Moderate savings (5-15%)
      verification.confidenceLevel = 'MEDIUM';
    } else {
      // Minimal savings
      verification.confidenceLevel = 'LOW';
    }

    verification.completedAt = new Date().toISOString();
    verification.status = verification.confidenceLevel === 'HIGH' ? 'COMPLETED' : 'INCONCLUSIVE';

    logger.info(
      {
        verificationId,
        fromModel: verification.fromModel,
        toModel: verification.toModel,
        baselineCost: verification.baselineCostUSD.toFixed(2),
        measuredCost: totalCostUSD.toFixed(2),
        realizedSavings: verification.realizedSavingsUSD.toFixed(2),
        savingsPercent: verification.realizedSavingsPercent.toFixed(1),
        confidence: verification.confidenceLevel,
        component: 'savings-verification',
      },
      'Savings measurement completed',
    );

    return verification;
  }

  /**
   * Get verification by ID
   */
  getVerification(verificationId: string): SavingsVerification | undefined {
    return this.verifications.get(verificationId);
  }

  /**
   * List verifications for a tenant
   */
  listVerifications(tenantId: string): SavingsVerification[] {
    return Array.from(this.verifications.values()).filter((v) => v.tenantId === tenantId);
  }

  /**
   * Build proof graph node for verification
   */
  buildProofGraphNode(verification: SavingsVerification): {
    nodeId: string;
    nodeType: string;
    label: string;
    properties: Record<string, unknown>;
  } {
    return {
      nodeId: `savings-verify-${verification.verificationId}`,
      nodeType: 'SAVINGS_VERIFICATION',
      label: `Realized Savings: $${verification.realizedSavingsUSD.toFixed(2)} (${verification.realizedSavingsPercent.toFixed(1)}%)`,
      properties: {
        verificationId: verification.verificationId,
        executionId: verification.executionId,
        fromModel: verification.fromModel,
        toModel: verification.toModel,
        baselineCostUSD: verification.baselineCostUSD,
        measuredCostUSD: verification.measuredCostUSD,
        realizedSavingsUSD: verification.realizedSavingsUSD,
        realizedSavingsPercent: verification.realizedSavingsPercent,
        confidenceLevel: verification.confidenceLevel,
        status: verification.status,
        startedAt: verification.startedAt,
        completedAt: verification.completedAt,
      },
    };
  }

  /**
   * Calculate total realized savings across all verifications for a tenant
   */
  getTotalRealizedSavings(tenantId: string): {
    totalSavingsUSD: number;
    completedCount: number;
    averageConfidence: string;
  } {
    const verifications = this.listVerifications(tenantId).filter((v) => v.status === 'COMPLETED');
    const totalSavings = verifications.reduce((sum, v) => sum + v.realizedSavingsUSD, 0);
    const confidenceScores = verifications.map((v) => {
      if (v.confidenceLevel === 'HIGH') return 3;
      if (v.confidenceLevel === 'MEDIUM') return 2;
      return 1;
    });
    const avgConfidence = confidenceScores.length > 0 ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : 0;
    const confidenceLabel = avgConfidence > 2.5 ? 'HIGH' : avgConfidence > 1.5 ? 'MEDIUM' : 'LOW';

    return {
      totalSavingsUSD: totalSavings,
      completedCount: verifications.length,
      averageConfidence: confidenceLabel,
    };
  }
}

export const savingsVerificationService = new SavingsVerificationService();
