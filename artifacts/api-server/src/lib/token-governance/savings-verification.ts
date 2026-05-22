/**
 * Savings Verification Service (Sprint D, Part 4)
 *
 * Tracks baseline costs before downgrade, measures post-downgrade costs,
 * calculates realized savings, and integrates with proof graph.
 *
 * State is persisted to DB (tokenGovernanceVerificationEventsTable) so it
 * survives process restarts.  In-memory Maps are no longer the source of truth.
 */

import { db, tokenGovernanceVerificationEventsTable } from '@workspace/db';
import { eq, and } from 'drizzle-orm';
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
  status: 'PENDING' | 'MEASURING' | 'VERIFIED' | 'FAILED' | 'EXPIRED' | 'INSUFFICIENT_EVIDENCE';
  confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  startedAt: string;
  completedAt?: string;
  proofGraphNodeId?: string;
};

// ---------------------------------------------------------------------------
// Internal helpers to convert between DB row and domain type
// ---------------------------------------------------------------------------

type DbRow = typeof tokenGovernanceVerificationEventsTable.$inferSelect;

function rowToVerification(row: DbRow): SavingsVerification {
  return {
    verificationId: row.verificationId,
    executionId: row.executionId ?? '',
    tenantId: row.tenantId,
    fromModel: row.fromModel ?? '',
    toModel: row.toModel ?? '',
    baselineTokens: Number(row.baselineTokens ?? 0),
    baselineCostUSD: Number(row.baselineCost ?? 0),
    measuredTokens: Number(row.measuredTokens ?? 0),
    measuredCostUSD: Number(row.measuredCost ?? 0),
    realizedSavingsUSD: Number(row.realizedSavings ?? 0),
    realizedSavingsPercent: Number(row.realizedSavingsPercent ?? 0),
    status: row.status as SavingsVerification['status'],
    confidenceLevel: (row.confidenceLevel ?? 'LOW') as SavingsVerification['confidenceLevel'],
    startedAt: row.startedAt.toISOString(),
    completedAt: row.completedAt?.toISOString(),
    proofGraphNodeId: row.proofGraphNodeId ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Baseline storage — baselines are lightweight transient records used only
// during the window between execution and measurement.  They are stored in
// the metadataJson of the verification row once a verification is created,
// so we keep an in-memory cache here purely for the short-lived pre-creation
// phase.  The Map is NOT the source of truth for verifications.
// ---------------------------------------------------------------------------

/**
 * Savings verification service
 */
export class SavingsVerificationService {
  // Baselines are only needed transiently (before a verification record exists).
  // We store them in-memory during that short window; they are written into the
  // DB when initializeVerification is called.
  private baselines: Map<string, BasellineMeasurement> = new Map();

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
   * Create verification record from an execution and persist to DB
   */
  async initializeVerification(executionId: string): Promise<SavingsVerification | undefined> {
    const execution = modelDowngradeExecutor.getExecution(executionId);
    if (!execution || execution.status !== 'EXECUTED') {
      return undefined;
    }

    const baseline = Array.from(this.baselines.values()).find((b) => b.executionId === executionId);
    if (!baseline) {
      return undefined;
    }

    const verificationId = `verify-${executionId}-${Date.now()}`;
    const now = new Date();

    await db.insert(tokenGovernanceVerificationEventsTable).values({
      tenantId: execution.tenantId,
      verificationId,
      executionId,
      fromModel: execution.fromModel,
      toModel: execution.toModel,
      baselineTokens: String(baseline.totalTokens),
      baselineCost: baseline.totalCostUSD.toFixed(4),
      measuredTokens: '0',
      measuredCost: '0.0000',
      realizedSavings: '0.0000',
      realizedSavingsPercent: '0.0000',
      status: 'PENDING',
      confidenceLevel: 'LOW',
      startedAt: now,
      metadataJson: { baseline },
    });

    const verification: SavingsVerification = {
      verificationId,
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
      startedAt: now.toISOString(),
    };

    return verification;
  }

  /**
   * Record measured cost after downgrade window, persisting to DB
   */
  async recordMeasurement(
    verificationId: string,
    tenantId: string,
    totalTokens: number,
    totalCostUSD: number,
  ): Promise<SavingsVerification | undefined> {
    // Fetch from DB, enforcing tenant isolation
    const rows = await db
      .select()
      .from(tokenGovernanceVerificationEventsTable)
      .where(
        and(
          eq(tokenGovernanceVerificationEventsTable.verificationId, verificationId),
          eq(tokenGovernanceVerificationEventsTable.tenantId, tenantId),
        ),
      );

    if (rows.length === 0) {
      return undefined;
    }

    const existing = rowToVerification(rows[0]);

    // Calculate realized savings
    const costSavings = existing.baselineCostUSD - totalCostUSD;
    const tokenReduction = existing.baselineTokens - totalTokens;

    const realizedSavingsUSD = Math.max(0, costSavings);
    const realizedSavingsPercent = existing.baselineCostUSD > 0 ? (costSavings / existing.baselineCostUSD) * 100 : 0;

    // Assess confidence
    let confidenceLevel: SavingsVerification['confidenceLevel'] = 'LOW';
    let status: SavingsVerification['status'];

    if (tokenReduction < 0) {
      // More tokens used — probably not a clean comparison
      confidenceLevel = 'LOW';
      status = 'INSUFFICIENT_EVIDENCE';
    } else if (realizedSavingsPercent >= 15) {
      confidenceLevel = 'HIGH';
      status = 'VERIFIED';
    } else if (realizedSavingsPercent >= 5) {
      confidenceLevel = 'MEDIUM';
      status = 'VERIFIED';
    } else {
      confidenceLevel = 'LOW';
      status = 'INSUFFICIENT_EVIDENCE';
    }

    const completedAt = new Date();

    await db
      .update(tokenGovernanceVerificationEventsTable)
      .set({
        measuredTokens: String(totalTokens),
        measuredCost: totalCostUSD.toFixed(4),
        realizedSavings: realizedSavingsUSD.toFixed(4),
        realizedSavingsPercent: realizedSavingsPercent.toFixed(4),
        status,
        confidenceLevel,
        completedAt,
        updatedAt: completedAt,
      })
      .where(
        and(
          eq(tokenGovernanceVerificationEventsTable.verificationId, verificationId),
          eq(tokenGovernanceVerificationEventsTable.tenantId, tenantId),
        ),
      );

    const updated: SavingsVerification = {
      ...existing,
      measuredTokens: totalTokens,
      measuredCostUSD: totalCostUSD,
      realizedSavingsUSD,
      realizedSavingsPercent,
      status,
      confidenceLevel,
      completedAt: completedAt.toISOString(),
    };

    logger.info(
      {
        verificationId,
        fromModel: updated.fromModel,
        toModel: updated.toModel,
        baselineCost: updated.baselineCostUSD.toFixed(2),
        measuredCost: totalCostUSD.toFixed(2),
        realizedSavings: updated.realizedSavingsUSD.toFixed(2),
        savingsPercent: updated.realizedSavingsPercent.toFixed(1),
        confidence: updated.confidenceLevel,
        component: 'savings-verification',
      },
      'Savings measurement completed',
    );

    return updated;
  }

  /**
   * Get verification by ID (tenant-scoped)
   */
  async getVerification(verificationId: string, tenantId: string): Promise<SavingsVerification | undefined> {
    const rows = await db
      .select()
      .from(tokenGovernanceVerificationEventsTable)
      .where(
        and(
          eq(tokenGovernanceVerificationEventsTable.verificationId, verificationId),
          eq(tokenGovernanceVerificationEventsTable.tenantId, tenantId),
        ),
      );

    return rows.length > 0 ? rowToVerification(rows[0]) : undefined;
  }

  /**
   * List verifications for a tenant
   */
  async listVerifications(tenantId: string): Promise<SavingsVerification[]> {
    const rows = await db
      .select()
      .from(tokenGovernanceVerificationEventsTable)
      .where(eq(tokenGovernanceVerificationEventsTable.tenantId, tenantId));

    return rows.map(rowToVerification);
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
  async getTotalRealizedSavings(tenantId: string): Promise<{
    totalSavingsUSD: number;
    completedCount: number;
    averageConfidence: string;
  }> {
    const verifications = (await this.listVerifications(tenantId)).filter((v) => v.status === 'VERIFIED');
    const totalSavings = verifications.reduce((sum, v) => sum + v.realizedSavingsUSD, 0);
    const confidenceScores = verifications.map((v) => {
      if (v.confidenceLevel === 'HIGH') return 3;
      if (v.confidenceLevel === 'MEDIUM') return 2;
      return 1;
    });
    const avgConfidence =
      confidenceScores.length > 0 ? confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length : 0;
    const confidenceLabel = avgConfidence > 2.5 ? 'HIGH' : avgConfidence > 1.5 ? 'MEDIUM' : 'LOW';

    return {
      totalSavingsUSD: totalSavings,
      completedCount: verifications.length,
      averageConfidence: confidenceLabel,
    };
  }
}

export const savingsVerificationService = new SavingsVerificationService();
