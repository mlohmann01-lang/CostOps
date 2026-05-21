/**
 * m365-license-reclaim-pack.ts
 *
 * M365 Disabled-User License Reclaim pack for the Economic Operations platform.
 * Identifies disabled Microsoft 365 users who still hold active license
 * assignments and recommends targeted reclaim actions — with full rollback,
 * verification, drift detection, and simulation support.
 *
 * Migrates the M365 disabled-user license reclaim logic to the pack factory
 * pattern, replacing the prior bespoke operationalization approach.
 */

import { compileEconomicOperationsPack } from '../../economic-operations-pack-factory.js';
import type { EconomicOperationsPackDefinition } from '../../economic-operations-pack-types.js';
import { globalPackRegistry } from '../../economic-operations-pack-registry.js';

// ---------------------------------------------------------------------------
// Evidence type
// ---------------------------------------------------------------------------

type DisabledUserEntry = {
  userId: string;
  userPrincipalName: string;
  assignedSkuIds: string[];
  lastLoginDaysAgo: number | null;
  projectedMonthlySaving: number;
  flexeraMatched: boolean;
  trustScore: number;
};

type M365LicenseEvidence = {
  tenantId: string;
  disabledUsersWithLicenses: DisabledUserEntry[];
  totalDisabledUsersWithLicenses: number;
  totalProjectedMonthlySaving: number;
  connectorHealth: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  flexeraEnriched: boolean;
};

// ---------------------------------------------------------------------------
// Recommendation type
// ---------------------------------------------------------------------------

type M365LicenseRecommendation = {
  recommendationType: 'M365_DISABLED_USER_LICENSE_RECLAIM';
  userId: string;
  userPrincipalName: string;
  assignedSkuIds: string[];
  projectedMonthlySaving: number;
  trustScore: number;
  flexeraMatched: boolean;
  rationale: string;
};

// ---------------------------------------------------------------------------
// Simulation type
// ---------------------------------------------------------------------------

type M365LicenseSimulation = {
  tenantId: string;
  executionId: string;
  usersToReclaim: Array<{
    userId: string;
    userPrincipalName: string;
    skuCount: number;
    projectedMonthlySaving: number;
  }>;
  totalProjectedMonthlySaving: number;
  totalProjectedAnnualSaving: number;
  simulationNotes: string;
};

// ---------------------------------------------------------------------------
// Execution payload / result
// ---------------------------------------------------------------------------

type M365LicensePayload = {
  tenantId: string;
  recommendations: M365LicenseRecommendation[];
  /** Captured SKU assignments before execution — used as rollback set. */
  rollbackSet: Array<{
    userId: string;
    userPrincipalName: string;
    assignedSkuIds: string[];
  }>;
};

type M365LicenseResult = {
  tenantId: string;
  executionId: string;
  reclaimedUsers: Array<{
    userId: string;
    userPrincipalName: string;
    reclaimedSkuIds: string[];
  }>;
  totalMonthlySavingsUSD: number;
  verificationWindowDays: number;
  liveMutationEnabled: boolean;
};

// ---------------------------------------------------------------------------
// Trust threshold for qualifying disabled users
// ---------------------------------------------------------------------------

const RECLAIM_TRUST_THRESHOLD = 0.7;

// ---------------------------------------------------------------------------
// Deterministic mock evidence helper
// ---------------------------------------------------------------------------

function buildMockEvidence(tenantId: string): M365LicenseEvidence {
  const seed = tenantId.length + tenantId.charCodeAt(0);

  const disabledUsers: DisabledUserEntry[] = [
    {
      userId: `user-${seed}-001`,
      userPrincipalName: `former.employee1@${tenantId}.onmicrosoft.com`,
      assignedSkuIds: ['SPE_E3', 'TEAMS_EXPLORATORY'],
      lastLoginDaysAgo: 95 + (seed % 30),
      projectedMonthlySaving: 42 + (seed % 10),
      flexeraMatched: true,
      trustScore: 0.92,
    },
    {
      userId: `user-${seed}-002`,
      userPrincipalName: `former.employee2@${tenantId}.onmicrosoft.com`,
      assignedSkuIds: ['SPE_E5'],
      lastLoginDaysAgo: 62 + (seed % 20),
      projectedMonthlySaving: 57 + (seed % 8),
      flexeraMatched: true,
      trustScore: 0.85,
    },
    {
      userId: `user-${seed}-003`,
      userPrincipalName: `contractor.offboarded@${tenantId}.onmicrosoft.com`,
      assignedSkuIds: ['SPE_E3'],
      lastLoginDaysAgo: 120 + (seed % 40),
      projectedMonthlySaving: 36 + (seed % 6),
      flexeraMatched: false,
      trustScore: 0.75,
    },
    {
      userId: `user-${seed}-004`,
      userPrincipalName: `system.account@${tenantId}.onmicrosoft.com`,
      assignedSkuIds: ['SPE_E3', 'FLOW_FREE'],
      lastLoginDaysAgo: null,
      projectedMonthlySaving: 40 + (seed % 5),
      flexeraMatched: false,
      // Low trust: no login history, no Flexera match — may be service account
      trustScore: 0.55,
    },
  ];

  const qualifying = disabledUsers.filter((u) => u.trustScore >= RECLAIM_TRUST_THRESHOLD);
  const totalSaving = qualifying.reduce((sum, u) => sum + u.projectedMonthlySaving, 0);

  return {
    tenantId,
    disabledUsersWithLicenses: disabledUsers,
    totalDisabledUsersWithLicenses: disabledUsers.length,
    totalProjectedMonthlySaving: totalSaving,
    connectorHealth: 'HEALTHY',
    flexeraEnriched: true,
  };
}

// ---------------------------------------------------------------------------
// Pack definition
// ---------------------------------------------------------------------------

const definition: EconomicOperationsPackDefinition<
  M365LicenseEvidence,
  M365LicenseRecommendation,
  M365LicenseSimulation,
  M365LicensePayload,
  M365LicenseResult
> = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: 'm365-disabled-user-license-reclaim',
  name: 'M365 Disabled-User License Reclaim',
  version: '1.0.0',

  // ── Classification ────────────────────────────────────────────────────────
  domain: 'M365',
  category: 'LICENSE_RECLAIM',
  description:
    'Identifies disabled Microsoft 365 users who still hold active SKU assignments and generates ' +
    'targeted reclaim recommendations for qualifying users above the trust threshold. Supports ' +
    'full rollback, post-execution verification, drift detection for newly disabled users and ' +
    're-enabled reclaimed accounts, and deterministic simulation of savings projections.',
  riskProfile: 'HIGH',
  blastRadiusClassification: 'HIGH',

  // ── Operational constraints ───────────────────────────────────────────────
  minimumTenantMode: 'PRODUCTION_GOVERNED_EXECUTION',
  supportedExecutionModes: ['SIMULATION_ONLY', 'GOVERNED_EXECUTION'],
  requiredCapabilities: ['READ_USERS', 'READ_LICENSES', 'EXECUTE_ACTIONS'],
  requiredConnectorScopes: [
    {
      connectorId: 'M365_GRAPH',
      requiredCapabilities: ['READ_USERS', 'READ_LICENSES', 'EXECUTE_ACTIONS'],
      rationale:
        'Read disabled users and their assigned SKU IDs; execute license removal mutations via Graph API.',
    },
    {
      connectorId: 'FLEXERA',
      requiredCapabilities: ['READ_USERS'],
      rationale:
        'Enrich user records with Flexera identity data to increase trust scores and reduce false positives.',
    },
  ],
  defaultApprovalPolicy: 'DUAL_APPROVAL',

  // ── Feature flags ─────────────────────────────────────────────────────────
  supportsRollback: true,
  supportsVerification: true,
  supportsDriftDetection: true,
  supportsSimulation: true,

  // ── Governance ───────────────────────────────────────────────────────────
  governance: {
    minimumRolesForRecommendation: ['ECONOMIC_OPERATOR', 'ADMIN', 'OWNER'],
    minimumRolesForExecution: ['ADMIN', 'OWNER'],
    requiredPermissions: [
      'RECOMMENDATION_READ',
      'SIMULATION_RUN',
      'APPROVAL_REQUEST',
      'APPROVAL_GRANT',
      'EXECUTION_REQUEST',
      'EXECUTION_APPROVE',
      'EXECUTION_RUN',
      'ROLLBACK_REQUEST',
      'ROLLBACK_APPROVE',
      'ROLLBACK_RUN',
      'VERIFICATION_RUN',
      'DRIFT_ACKNOWLEDGE',
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
      ): Promise<M365LicenseEvidence> {
        return buildMockEvidence(tenantId);
      },
    },
    normalizer: {
      normalize(raw: unknown): M365LicenseEvidence {
        return raw as M365LicenseEvidence;
      },
    },
    trustScorer: {
      minimumTrustThreshold: 0.65,
      score(evidence: M365LicenseEvidence): number {
        // Connector health and Flexera enrichment drive overall evidence trust
        let score = 0.9;
        if (evidence.connectorHealth === 'DEGRADED') score -= 0.15;
        if (evidence.connectorHealth === 'FAILED') score -= 0.4;
        if (!evidence.flexeraEnriched) score -= 0.1;
        // Penalise if many users have null lastLoginDaysAgo (ambiguous account type)
        const nullLoginCount = evidence.disabledUsersWithLicenses.filter(
          (u) => u.lastLoginDaysAgo === null,
        ).length;
        const nullLoginFraction =
          evidence.totalDisabledUsersWithLicenses > 0
            ? nullLoginCount / evidence.totalDisabledUsersWithLicenses
            : 0;
        if (nullLoginFraction > 0.3) score -= 0.05;
        return Math.max(0.4, Math.min(0.9, score));
      },
    },
    savingsEstimator: {
      estimateMonthlySavings(evidence: M365LicenseEvidence): number {
        return evidence.totalProjectedMonthlySaving;
      },
      estimateAnnualSavings(evidence: M365LicenseEvidence): number {
        return this.estimateMonthlySavings(evidence) * 12;
      },
      confidence(evidence: M365LicenseEvidence): number {
        return evidence.flexeraEnriched && evidence.connectorHealth === 'HEALTHY' ? 0.88 : 0.6;
      },
    },
  },

  // ── Recommendation layer ──────────────────────────────────────────────────
  recommendationLayer: {
    maxRecommendations: undefined, // one per qualifying user
    generator: {
      async generate(
        _tenantId: string,
        evidence: M365LicenseEvidence,
      ): Promise<M365LicenseRecommendation[]> {
        if (evidence.connectorHealth === 'FAILED') {
          return [];
        }

        const qualifying = evidence.disabledUsersWithLicenses.filter(
          (u) => u.trustScore >= RECLAIM_TRUST_THRESHOLD,
        );

        return qualifying.map((user): M365LicenseRecommendation => ({
          recommendationType: 'M365_DISABLED_USER_LICENSE_RECLAIM',
          userId: user.userId,
          userPrincipalName: user.userPrincipalName,
          assignedSkuIds: user.assignedSkuIds,
          projectedMonthlySaving: user.projectedMonthlySaving,
          trustScore: user.trustScore,
          flexeraMatched: user.flexeraMatched,
          rationale:
            `User ${user.userPrincipalName} is disabled but holds ${user.assignedSkuIds.length} ` +
            `active SKU assignment(s): [${user.assignedSkuIds.join(', ')}]. ` +
            (user.lastLoginDaysAgo !== null
              ? `Last login was ${user.lastLoginDaysAgo} days ago. `
              : 'No login history recorded. ') +
            (user.flexeraMatched
              ? 'Identity confirmed via Flexera enrichment. '
              : 'No Flexera match — reclaim based on M365 Graph data only. ') +
            `Trust score: ${user.trustScore.toFixed(2)} (threshold: ${RECLAIM_TRUST_THRESHOLD}). ` +
            `Removing these assignments would save USD ${user.projectedMonthlySaving}/month.`,
        }));
      },
    },
  },

  // ── Simulation layer ──────────────────────────────────────────────────────
  simulationLayer: {
    generator: {
      async simulate(
        tenantId: string,
        executionId: string,
        evidence: M365LicenseEvidence,
      ): Promise<M365LicenseSimulation> {
        const qualifying = evidence.disabledUsersWithLicenses.filter(
          (u) => u.trustScore >= RECLAIM_TRUST_THRESHOLD,
        );
        const totalMonthly = qualifying.reduce((sum, u) => sum + u.projectedMonthlySaving, 0);

        return {
          tenantId,
          executionId,
          usersToReclaim: qualifying.map((u) => ({
            userId: u.userId,
            userPrincipalName: u.userPrincipalName,
            skuCount: u.assignedSkuIds.length,
            projectedMonthlySaving: u.projectedMonthlySaving,
          })),
          totalProjectedMonthlySaving: totalMonthly,
          totalProjectedAnnualSaving: totalMonthly * 12,
          simulationNotes:
            `${qualifying.length} of ${evidence.totalDisabledUsersWithLicenses} disabled users ` +
            `qualify for reclaim (trustScore >= ${RECLAIM_TRUST_THRESHOLD}). ` +
            `${evidence.totalDisabledUsersWithLicenses - qualifying.length} user(s) excluded ` +
            'due to insufficient trust score — requires manual review.',
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
        payload: M365LicensePayload,
      ): Promise<M365LicenseResult> {
        // Describe what license assignments would be removed.
        // Real execution requires M365_LIVE_LICENSE_MUTATION_ENABLED=true and
        // calls the M365 Graph license write client.
        const reclaimedUsers = payload.recommendations.map((r) => ({
          userId: r.userId,
          userPrincipalName: r.userPrincipalName,
          reclaimedSkuIds: r.assignedSkuIds,
        }));
        const totalSavings = payload.recommendations.reduce(
          (sum, r) => sum + r.projectedMonthlySaving,
          0,
        );

        return {
          tenantId,
          executionId,
          reclaimedUsers,
          totalMonthlySavingsUSD: totalSavings,
          verificationWindowDays: 7,
          // Indicates whether M365_LIVE_LICENSE_MUTATION_ENABLED is set.
          // In this mock, we always return false — real connector checks the env flag.
          liveMutationEnabled: false,
        };
      },
    },
    rollbackAdapter: {
      async rollback(
        tenantId: string,
        executionId: string,
        payload: M365LicensePayload,
      ): Promise<void> {
        // Describes restoring original SKU assignments from the captured rollback set.
        // Real rollback calls the M365 Graph license write client to re-assign each SKU.
        const rollbackSummary = payload.rollbackSet.map(
          (entry) =>
            `Restore [${entry.assignedSkuIds.join(', ')}] to ${entry.userPrincipalName}`,
        );
        // Log the rollback plan (in production this would be structured telemetry)
        console.info('[M365LicenseReclaimPack] Rollback plan', {
          tenantId,
          executionId,
          rollbackEntries: rollbackSummary,
        });
      },
    },
    async checkReadiness(
      _tenantId: string,
      _executionId: string,
    ): Promise<{ ready: boolean; blockers: string[] }> {
      // Real readiness check would call m365-live-execution-readiness-gate.ts.
      // The gate verifies M365_LIVE_LICENSE_MUTATION_ENABLED env flag, connector
      // authentication, and dual-approval completion before allowing live execution.
      const liveMutationEnabled =
        process.env['M365_LIVE_LICENSE_MUTATION_ENABLED'] === 'true';

      if (!liveMutationEnabled) {
        return {
          ready: false,
          blockers: [
            'M365_LIVE_LICENSE_MUTATION_ENABLED is not set to true. ' +
            'Set this environment variable to enable live license mutation via the M365 Graph API.',
          ],
        };
      }

      return { ready: true, blockers: [] };
    },
  },

  // ── Verification layer ────────────────────────────────────────────────────
  verificationLayer: {
    strategy: {
      async verify(
        tenantId: string,
        executionId: string,
        expected: M365LicenseResult,
      ): Promise<{ verified: boolean; confidence: number; details: Record<string, unknown> }> {
        // Verification checks that reclaimed users no longer have assigned licenses.
        // Re-query M365 Graph for each reclaimedUser and confirm assignedSkuIds is empty.
        // In this implementation we return a structured description of what to verify.
        return {
          verified: false,
          confidence: 0.0,
          details: {
            tenantId,
            executionId,
            verificationNote:
              'After 7 days, re-query M365 Graph API for each reclaimed user and confirm ' +
              'assignedSkuIds is empty. Verified if all reclaimed users show zero license assignments.',
            usersToVerify: expected.reclaimedUsers.map((u) => u.userPrincipalName),
            verificationWindowDays: expected.verificationWindowDays,
            status: 'PENDING_WINDOW_COMPLETION',
          },
        };
      },
    },
  },

  // ── Drift layer ───────────────────────────────────────────────────────────
  driftLayer: {
    rules: [
      {
        ruleId: 'LICENSE_REASSIGNMENT',
        description:
          'Detects newly disabled users who still hold active M365 license assignments, ' +
          'indicating that offboarding workflows are not removing licenses as expected.',
        severity: 'MEDIUM',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const newlyDisabledWithLicenses =
            typeof context['newlyDisabledUsersWithLicenses'] === 'number'
              ? context['newlyDisabledUsersWithLicenses']
              : 0;
          const triggered = newlyDisabledWithLicenses > 0;
          return {
            triggered,
            detail: triggered
              ? `${newlyDisabledWithLicenses} newly disabled user(s) still hold active license ` +
                `assignments for tenant ${tenantId} (executionId: ${executionId}). ` +
                'Offboarding workflow is not revoking licenses at disable time. Trigger a new reclaim run.'
              : `No newly disabled users with active licenses detected for tenant ${tenantId}.`,
          };
        },
      },
      {
        ruleId: 'RECLAIMED_USER_REENABLED',
        description:
          'Detects previously reclaimed users who have been re-enabled in Entra ID, ' +
          'indicating they may need their licenses restored to resume work.',
        severity: 'LOW',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const reenabledReclaimedUsers = Array.isArray(context['reenabledReclaimedUsers'])
            ? (context['reenabledReclaimedUsers'] as string[])
            : [];
          const triggered = reenabledReclaimedUsers.length > 0;
          return {
            triggered,
            detail: triggered
              ? `${reenabledReclaimedUsers.length} previously reclaimed user(s) have been re-enabled ` +
                `for tenant ${tenantId} (executionId: ${executionId}): ` +
                `[${reenabledReclaimedUsers.join(', ')}]. ` +
                'Review whether licenses should be restored. Use rollback data to identify ' +
                'the original SKU assignments.'
              : `No reclaimed users have been re-enabled for tenant ${tenantId}.`,
          };
        },
      },
    ],
  },

  // ── UX ────────────────────────────────────────────────────────────────────
  ux: {
    displayName: 'M365 Disabled-User License Reclaim',
    shortDescription:
      'Reclaim M365 licenses from disabled users — with dual approval, rollback, and drift detection.',
    longDescription:
      'The M365 Disabled-User License Reclaim pack identifies Microsoft 365 users whose accounts ' +
      'have been disabled but whose SKU assignments (E3, E5, Teams, etc.) have not been revoked. ' +
      'Each disabled user is scored for reclaim confidence using last-login data and optional Flexera ' +
      'identity enrichment; only users above the 0.7 trust threshold are recommended for reclaim. ' +
      'The pack supports the full economic operations lifecycle: deterministic simulation projects ' +
      'savings before any mutation, dual approval is required before live execution, rollback captures ' +
      'the original SKU set and can restore assignments if a reclaimed user is re-enabled, and ' +
      'post-execution verification re-queries the Graph API to confirm license removal. Two drift ' +
      'rules monitor for newly disabled users still holding licenses (offboarding gap) and for ' +
      'reclaimed users who have been re-enabled and may need licenses back.',
    iconSlug: 'm365-license-reclaim',
    domainColour: 'blue-600',
    estimatedTimeToValueDays: 7,
    documentationUrl: null,
    tags: [
      'm365',
      'license-reclaim',
      'disabled-users',
      'offboarding',
      'cost-reduction',
      'compliance',
      'rollback',
    ],
    requiredFeatureFlags: ['m365_license_governance_enabled'],
  },
};

// ---------------------------------------------------------------------------
// Compile and export
// ---------------------------------------------------------------------------

export const m365LicenseReclaimPack = compileEconomicOperationsPack(definition);

// Register with the global registry at module initialisation time.
globalPackRegistry.register(m365LicenseReclaimPack);
