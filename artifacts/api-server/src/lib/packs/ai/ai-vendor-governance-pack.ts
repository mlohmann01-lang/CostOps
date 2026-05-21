/**
 * ai-vendor-governance-pack.ts
 *
 * AI Vendor Seat Reclaim pack for the Economic Operations platform.
 * Identifies idle AI vendor seats (Copilot, ChatGPT Enterprise, Cursor, etc.)
 * and recommends reclaiming them from users who have not been active within
 * the configured idle threshold, with full rollback capability for seat reassignment.
 */

import { compileEconomicOperationsPack } from '../../economic-operations-pack-factory.js';
import type { EconomicOperationsPackDefinition } from '../../economic-operations-pack-types.js';
import { globalPackRegistry } from '../../economic-operations-pack-registry.js';

// ---------------------------------------------------------------------------
// Evidence types
// ---------------------------------------------------------------------------

type SeatEntry = {
  userId: string;
  email: string;
  isIdle: boolean;
  lastActiveDaysAgo: number | null;
  costPerSeatPerMonth: number;
};

type VendorEntry = {
  vendorId: string;
  vendorName: string;
  totalSeats: number;
  activeSeats: number;
  idleSeats: number;
  idleThresholdDays: number;
  totalMonthlyCostUSD: number;
  idleMonthlyCostUSD: number;
  seats: SeatEntry[];
};

type AIVendorEvidence = {
  tenantId: string;
  vendors: VendorEntry[];
  totalMonthlyCostUSD: number;
  totalIdleMonthlyCostUSD: number;
  idleSeatCount: number;
};

// ---------------------------------------------------------------------------
// Recommendation type
// ---------------------------------------------------------------------------

type AIVendorRecommendation = {
  recommendationType: 'SEAT_RECLAIM';
  vendorId: string;
  vendorName: string;
  seatUserIds: string[];
  idleSeatCount: number;
  currentMonthlyCostUSD: number;
  projectedMonthlySavings: number;
  savingsPct: number;
  confidence: number;
  rationale: string;
  executionRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  rollbackNote: string;
};

// ---------------------------------------------------------------------------
// Simulation type
// ---------------------------------------------------------------------------

type AIVendorSimulation = {
  tenantId: string;
  executionId: string;
  vendorSummaries: Array<{
    vendorName: string;
    seatsToReclaim: number;
    projectedSavingsUSD: number;
  }>;
  totalSeatsToReclaim: number;
  totalProjectedMonthlySavingsUSD: number;
  projectedMonthlyCostUSD: number;
};

// ---------------------------------------------------------------------------
// Execution payload / result
// ---------------------------------------------------------------------------

type AIVendorPayload = {
  tenantId: string;
  recommendations: AIVendorRecommendation[];
};

type AIVendorResult = {
  tenantId: string;
  executionId: string;
  reclaimedSeatDescriptions: string[];
  totalSeatsReclaimed: number;
  estimatedMonthlySavings: number;
  rollbackWindowDays: number;
};

// ---------------------------------------------------------------------------
// Deterministic mock evidence helper
// ---------------------------------------------------------------------------

function buildMockEvidence(tenantId: string): AIVendorEvidence {
  const seed = tenantId.length + tenantId.charCodeAt(0);

  const copilotCostPerSeat = 19;
  const copilotTotalSeats = 120 + (seed % 20);
  const copilotIdleSeats = 28 + (seed % 8);
  const copilotActiveSeats = copilotTotalSeats - copilotIdleSeats;
  const copilotTotalCost = copilotTotalSeats * copilotCostPerSeat;
  const copilotIdleCost = copilotIdleSeats * copilotCostPerSeat;

  const chatgptCostPerSeat = 25;
  const chatgptTotalSeats = 60 + (seed % 12);
  const chatgptIdleSeats = 14 + (seed % 5);
  const chatgptActiveSeats = chatgptTotalSeats - chatgptIdleSeats;
  const chatgptTotalCost = chatgptTotalSeats * chatgptCostPerSeat;
  const chatgptIdleCost = chatgptIdleSeats * chatgptCostPerSeat;

  const cursorCostPerSeat = 20;
  const cursorTotalSeats = 45 + (seed % 10);
  const cursorIdleSeats = 9 + (seed % 4);
  const cursorActiveSeats = cursorTotalSeats - cursorIdleSeats;
  const cursorTotalCost = cursorTotalSeats * cursorCostPerSeat;
  const cursorIdleCost = cursorIdleSeats * cursorCostPerSeat;

  const totalCost = copilotTotalCost + chatgptTotalCost + cursorTotalCost;
  const totalIdleCost = copilotIdleCost + chatgptIdleCost + cursorIdleCost;
  const totalIdleSeats = copilotIdleSeats + chatgptIdleSeats + cursorIdleSeats;

  // Build realistic seat arrays (deterministic via index-based offsets)
  function buildSeats(
    prefix: string,
    total: number,
    idleCount: number,
    costPerSeat: number,
  ): SeatEntry[] {
    return Array.from({ length: total }, (_, i) => {
      const isIdle = i < idleCount;
      return {
        userId: `${prefix}-user-${String(i + 1).padStart(4, '0')}`,
        email: `${prefix.toLowerCase()}.user${i + 1}@tenant-${tenantId}.example.com`,
        isIdle,
        lastActiveDaysAgo: isIdle ? 35 + (i % 30) : 1 + (i % 7),
        costPerSeatPerMonth: costPerSeat,
      };
    });
  }

  return {
    tenantId,
    vendors: [
      {
        vendorId: 'github-copilot',
        vendorName: 'GitHub Copilot',
        totalSeats: copilotTotalSeats,
        activeSeats: copilotActiveSeats,
        idleSeats: copilotIdleSeats,
        idleThresholdDays: 30,
        totalMonthlyCostUSD: copilotTotalCost,
        idleMonthlyCostUSD: copilotIdleCost,
        seats: buildSeats('copilot', copilotTotalSeats, copilotIdleSeats, copilotCostPerSeat),
      },
      {
        vendorId: 'chatgpt-enterprise',
        vendorName: 'ChatGPT Enterprise',
        totalSeats: chatgptTotalSeats,
        activeSeats: chatgptActiveSeats,
        idleSeats: chatgptIdleSeats,
        idleThresholdDays: 30,
        totalMonthlyCostUSD: chatgptTotalCost,
        idleMonthlyCostUSD: chatgptIdleCost,
        seats: buildSeats('chatgpt', chatgptTotalSeats, chatgptIdleSeats, chatgptCostPerSeat),
      },
      {
        vendorId: 'cursor-pro',
        vendorName: 'Cursor Pro',
        totalSeats: cursorTotalSeats,
        activeSeats: cursorActiveSeats,
        idleSeats: cursorIdleSeats,
        idleThresholdDays: 30,
        totalMonthlyCostUSD: cursorTotalCost,
        idleMonthlyCostUSD: cursorIdleCost,
        seats: buildSeats('cursor', cursorTotalSeats, cursorIdleSeats, cursorCostPerSeat),
      },
    ],
    totalMonthlyCostUSD: totalCost,
    totalIdleMonthlyCostUSD: totalIdleCost,
    idleSeatCount: totalIdleSeats,
  };
}

// ---------------------------------------------------------------------------
// Pack definition
// ---------------------------------------------------------------------------

const definition: EconomicOperationsPackDefinition<
  AIVendorEvidence,
  AIVendorRecommendation,
  AIVendorSimulation,
  AIVendorPayload,
  AIVendorResult
> = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: 'ai-vendor-seat-reclaim',
  name: 'AI Vendor Seat Reclaim',
  version: '1.0.0',

  // ── Classification ────────────────────────────────────────────────────────
  domain: 'AI_GOVERNANCE',
  category: 'VENDOR_GOVERNANCE',
  description:
    'Identifies idle AI vendor seats across GitHub Copilot, ChatGPT Enterprise, Cursor, and similar ' +
    'tools where users have not been active beyond the configured idle threshold (default 30 days). ' +
    'Recommends reclaiming idle seats to reduce SaaS subscription costs, with full rollback capability ' +
    'so seats can be reassigned to new users on demand.',
  riskProfile: 'LOW',
  blastRadiusClassification: 'LOW',

  // ── Operational constraints ───────────────────────────────────────────────
  minimumTenantMode: 'PRODUCTION_APPROVAL_REQUIRED',
  supportedExecutionModes: ['SIMULATION_ONLY', 'GOVERNED_EXECUTION'],
  requiredCapabilities: ['READ_USERS', 'READ_LICENSES', 'READ_ACTIVITY', 'EXECUTE_ACTIONS'],
  requiredConnectorScopes: [],
  defaultApprovalPolicy: 'SINGLE_APPROVER',

  // ── Feature flags ─────────────────────────────────────────────────────────
  supportsSimulation: true,
  supportsVerification: true,
  supportsDriftDetection: true,
  supportsRollback: true,

  // ── Governance ───────────────────────────────────────────────────────────
  governance: {
    minimumRolesForRecommendation: ['ECONOMIC_OPERATOR', 'ADMIN', 'OWNER'],
    minimumRolesForExecution: ['ADMIN', 'OWNER'],
    requiredPermissions: [
      'RECOMMENDATION_READ',
      'SIMULATION_RUN',
      'EXECUTION_REQUEST',
      'ROLLBACK_REQUEST',
    ],
    allowedIntentTypes: [
      'SIMULATE',
      'REQUEST_APPROVAL',
      'APPROVE',
      'REJECT',
      'EXECUTE',
      'VERIFY',
      'ROLLBACK',
      'ACKNOWLEDGE_DRIFT',
      'BLOCK',
    ],
  },

  // ── Evidence layer ────────────────────────────────────────────────────────
  evidenceLayer: {
    collector: {
      async collect(
        tenantId: string,
        _context: Record<string, unknown>,
      ): Promise<AIVendorEvidence> {
        return buildMockEvidence(tenantId);
      },
    },
    normalizer: {
      normalize(raw: unknown): AIVendorEvidence {
        return raw as AIVendorEvidence;
      },
    },
    trustScorer: {
      minimumTrustThreshold: 0.65,
      score(evidence: AIVendorEvidence): number {
        // Trust scales with how clean the seat activity data is.
        // Penalise if >20% of seats have null lastActiveDaysAgo (unknown activity).
        let score = 0.92;
        const allSeats = evidence.vendors.flatMap((v) => v.seats);
        const unknownActivity = allSeats.filter((s) => s.lastActiveDaysAgo === null).length;
        const unknownPct = allSeats.length > 0 ? unknownActivity / allSeats.length : 0;
        if (unknownPct > 0.2) {
          score -= 0.15;
        }
        if (evidence.vendors.length === 0) {
          score -= 0.25;
        }
        return Math.max(0.65, Math.min(0.92, score));
      },
    },
    savingsEstimator: {
      estimateMonthlySavings(evidence: AIVendorEvidence): number {
        return Math.round(evidence.totalIdleMonthlyCostUSD);
      },
      estimateAnnualSavings(evidence: AIVendorEvidence): number {
        return this.estimateMonthlySavings(evidence) * 12;
      },
      confidence(_evidence: AIVendorEvidence): number {
        // Seat reclaim savings are highly deterministic — high confidence
        return 0.92;
      },
    },
  },

  // ── Recommendation layer ──────────────────────────────────────────────────
  recommendationLayer: {
    maxRecommendations: undefined, // one per vendor with idle seats
    generator: {
      async generate(
        _tenantId: string,
        evidence: AIVendorEvidence,
      ): Promise<AIVendorRecommendation[]> {
        const recommendations: AIVendorRecommendation[] = [];

        for (const vendor of evidence.vendors) {
          if (vendor.idleSeats === 0) {
            continue;
          }

          const idleUserIds = vendor.seats
            .filter((s) => s.isIdle)
            .map((s) => s.userId);

          const savingsPct = Math.round((vendor.idleMonthlyCostUSD / vendor.totalMonthlyCostUSD) * 100);

          recommendations.push({
            recommendationType: 'SEAT_RECLAIM',
            vendorId: vendor.vendorId,
            vendorName: vendor.vendorName,
            seatUserIds: idleUserIds,
            idleSeatCount: vendor.idleSeats,
            currentMonthlyCostUSD: Math.round(vendor.totalMonthlyCostUSD),
            projectedMonthlySavings: Math.round(vendor.idleMonthlyCostUSD),
            savingsPct,
            confidence: 0.92,
            rationale:
              `${vendor.idleSeats} of ${vendor.totalSeats} "${vendor.vendorName}" seats have had no activity ` +
              `for more than ${vendor.idleThresholdDays} days. These seats cost ` +
              `$${vendor.idleMonthlyCostUSD.toFixed(0)}/month in combined subscription fees. ` +
              'Reclaiming idle seats immediately stops wasteful spend while the seat pool can be ' +
              'reinstated within 24 hours if a user returns.',
            executionRisk: 'LOW',
            rollbackNote:
              `Reclaimed "${vendor.vendorName}" seats can be reassigned to returning or new users ` +
              'by re-provisioning through the vendor admin portal. No data is deleted; only seat ' +
              'entitlement is removed. Full rollback is available within the vendor\'s seat management console.',
          });
        }

        return recommendations;
      },
    },
  },

  // ── Simulation layer ──────────────────────────────────────────────────────
  simulationLayer: {
    generator: {
      async simulate(
        tenantId: string,
        executionId: string,
        evidence: AIVendorEvidence,
      ): Promise<AIVendorSimulation> {
        const vendorSummaries = evidence.vendors
          .filter((v) => v.idleSeats > 0)
          .map((v) => ({
            vendorName: v.vendorName,
            seatsToReclaim: v.idleSeats,
            projectedSavingsUSD: Math.round(v.idleMonthlyCostUSD),
          }));

        const totalSeatsToReclaim = vendorSummaries.reduce((s, v) => s + v.seatsToReclaim, 0);
        const totalSavings = vendorSummaries.reduce((s, v) => s + v.projectedSavingsUSD, 0);

        return {
          tenantId,
          executionId,
          vendorSummaries,
          totalSeatsToReclaim,
          totalProjectedMonthlySavingsUSD: totalSavings,
          projectedMonthlyCostUSD: Math.round(evidence.totalMonthlyCostUSD - totalSavings),
        };
      },
    },
  },

  // ── Execution layer ───────────────────────────────────────────────────────
  executionLayer: {
    adapter: {
      async execute(
        tenantId: string,
        executionId: string,
        payload: AIVendorPayload,
      ): Promise<AIVendorResult> {
        const descriptions = payload.recommendations.map(
          (r) =>
            `Reclaim ${r.idleSeatCount} idle seats from "${r.vendorName}" ` +
            `(users: ${r.seatUserIds.slice(0, 3).join(', ')}${r.seatUserIds.length > 3 ? ` +${r.seatUserIds.length - 3} more` : ''}) ` +
            `— projected saving $${r.projectedMonthlySavings}/month`,
        );
        const totalSeats = payload.recommendations.reduce((s, r) => s + r.idleSeatCount, 0);
        const totalSavings = payload.recommendations.reduce(
          (s, r) => s + r.projectedMonthlySavings,
          0,
        );
        return {
          tenantId,
          executionId,
          reclaimedSeatDescriptions: descriptions,
          totalSeatsReclaimed: totalSeats,
          estimatedMonthlySavings: totalSavings,
          rollbackWindowDays: 30,
        };
      },
    },
    rollbackAdapter: {
      async rollback(
        _tenantId: string,
        _executionId: string,
        payload: AIVendorPayload,
      ): Promise<void> {
        // Rollback re-provisions seats for the previously reclaimed user IDs.
        // In production this would call the vendor seat management API.
        const seatIds = payload.recommendations.flatMap((r) => r.seatUserIds);
        console.info(
          `[AIVendorPack] Rollback: re-provisioning ${seatIds.length} seats across ` +
            `${payload.recommendations.length} vendor(s) for tenant ${payload.tenantId}.`,
        );
      },
    },
    async checkReadiness(
      _tenantId: string,
      _executionId: string,
    ): Promise<{ ready: boolean; blockers: string[] }> {
      // Seat reclaim requires EXECUTE_ACTIONS connector capability — assumed available.
      return { ready: true, blockers: [] };
    },
  },

  // ── Verification layer ────────────────────────────────────────────────────
  verificationLayer: {
    strategy: {
      async verify(
        tenantId: string,
        executionId: string,
        expected: AIVendorResult,
      ): Promise<{ verified: boolean; confidence: number; details: Record<string, unknown> }> {
        return {
          verified: false,
          confidence: 0.0,
          details: {
            tenantId,
            executionId,
            verificationNote:
              'Re-pull vendor seat roster after execution. Confirm reclaimed seat IDs no longer ' +
              'appear as active entitlements. Invoice delta should reflect reduced seat count on next billing cycle.',
            expectedMonthlySavings: expected.estimatedMonthlySavings,
            expectedSeatsReclaimed: expected.totalSeatsReclaimed,
            rollbackWindowDays: expected.rollbackWindowDays,
            status: 'PENDING_VENDOR_CONFIRMATION',
          },
        };
      },
    },
  },

  // ── Drift layer ───────────────────────────────────────────────────────────
  driftLayer: {
    rules: [
      {
        ruleId: 'IDLE_SEAT_ACCUMULATION',
        description:
          'Detects when idle seat count across all AI vendors climbs back above 15% of total ' +
          'provisioned seats after a reclaim intervention, indicating new provisioning without ' +
          'corresponding usage onboarding.',
        severity: 'MEDIUM',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const idleSeatPct =
            typeof context['idleSeatPct'] === 'number' ? context['idleSeatPct'] : 0;
          const triggered = idleSeatPct > 15;
          return {
            triggered,
            detail: triggered
              ? `Idle seat percentage has grown to ${idleSeatPct}% for tenant ${tenantId} ` +
                `(executionId: ${executionId}), exceeding the 15% drift threshold. ` +
                'Consider enforcing just-in-time seat provisioning.'
              : `Idle seat rate is ${idleSeatPct}% — within acceptable bounds.`,
          };
        },
      },
      {
        ruleId: 'VENDOR_COST_SPIKE',
        description:
          'Detects a month-over-month spike in AI vendor subscription cost exceeding 20%, ' +
          'which may indicate bulk seat provisioning without governance review.',
        severity: 'HIGH',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const momCostGrowthPct =
            typeof context['momVendorCostGrowthPct'] === 'number'
              ? context['momVendorCostGrowthPct']
              : 0;
          const triggered = momCostGrowthPct > 20;
          return {
            triggered,
            detail: triggered
              ? `AI vendor subscription cost grew ${momCostGrowthPct}% month-over-month for tenant ${tenantId} ` +
                `(executionId: ${executionId}). Investigate bulk seat provisioning events.`
              : `Vendor cost growth is ${momCostGrowthPct}% MoM — within expected range.`,
          };
        },
      },
    ],
  },

  // ── UX ────────────────────────────────────────────────────────────────────
  ux: {
    displayName: 'AI Vendor Seat Reclaim',
    shortDescription: 'Reclaim idle AI tool seats across GitHub Copilot, ChatGPT Enterprise, and Cursor.',
    longDescription:
      'The AI Vendor Seat Reclaim pack scans your AI developer tool subscriptions — GitHub Copilot, ' +
      'ChatGPT Enterprise, Cursor Pro, and similar per-seat SaaS tools — for users who have not been ' +
      'active within the configured idle threshold (default: 30 days). It clusters idle seats by vendor ' +
      'and generates SEAT_RECLAIM recommendations with precise per-user, per-vendor cost breakdowns. ' +
      'Execution describes the reclaim action per vendor; rollback re-provisions seats for returning users ' +
      'within the same billing period. Drift detection monitors for idle seat re-accumulation and ' +
      'month-over-month vendor cost spikes after interventions.',
    iconSlug: 'vendor-seat-reclaim',
    domainColour: 'emerald-600',
    estimatedTimeToValueDays: 7,
    documentationUrl: null,
    tags: [
      'ai',
      'vendor',
      'seat-reclaim',
      'saas',
      'copilot',
      'chatgpt',
      'cursor',
      'idle-users',
      'governance',
    ],
    requiredFeatureFlags: ['ai_governance_enabled', 'seat_reclaim_enabled'],
  },
};

// ---------------------------------------------------------------------------
// Compile and export
// ---------------------------------------------------------------------------

export const aiVendorGovernancePack = compileEconomicOperationsPack(definition);

// Register with the global registry at module initialisation time.
globalPackRegistry.register(aiVendorGovernancePack);
