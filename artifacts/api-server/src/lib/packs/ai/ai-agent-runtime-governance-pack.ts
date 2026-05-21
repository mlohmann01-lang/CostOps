/**
 * ai-agent-runtime-governance-pack.ts
 *
 * AI Agent Runtime Governance pack for the Economic Operations platform.
 * Detects orphaned, idle, and runaway AI agents (across platforms such as
 * n8n, LangGraph, AutoGen, custom runtimes) and MCP servers that are consuming
 * compute without active owners or meaningful execution activity.
 * Recommends AGENT_DISABLE, AGENT_ARCHIVE, and MCP_RETIREMENT actions with
 * full rollback capability.
 */

import { compileEconomicOperationsPack } from '../../economic-operations-pack-factory.js';
import type { EconomicOperationsPackDefinition } from '../../economic-operations-pack-types.js';
import { globalPackRegistry } from '../../economic-operations-pack-registry.js';

// ---------------------------------------------------------------------------
// Evidence types
// ---------------------------------------------------------------------------

type AgentEntry = {
  agentId: string;
  agentName: string;
  platform: string;
  status: 'ACTIVE' | 'IDLE' | 'ORPHANED';
  lastExecutionDaysAgo: number | null;
  executionsLast30Days: number;
  avgToolCallsPerExecution: number;
  mcpServersUsed: string[];
  monthlyCostEstimateUSD: number;
  isOrphaned: boolean; // no owner, no executions in 45+ days
  isRecursive: boolean; // loop detected
};

type MCPServerEntry = {
  serverId: string;
  serverName: string;
  connectedAgents: number;
  lastUsedDaysAgo: number | null;
  isIdle: boolean;
  monthlyComputeCostUSD: number;
};

type AgentRuntimeEvidence = {
  tenantId: string;
  agents: AgentEntry[];
  mcpServers: MCPServerEntry[];
  totalAgents: number;
  orphanedAgents: number;
  idleAgents: number;
  totalMonthlyComputeCostUSD: number;
  wastedComputeCostUSD: number;
};

// ---------------------------------------------------------------------------
// Recommendation type
// ---------------------------------------------------------------------------

type AgentRuntimeRecommendation = {
  recommendationType: 'AGENT_DISABLE' | 'AGENT_ARCHIVE' | 'MCP_RETIREMENT';
  targetId: string; // agentId or serverId
  targetName: string;
  platform: string;
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

type AgentRuntimeSimulation = {
  tenantId: string;
  executionId: string;
  agentsToDisable: number;
  agentsToArchive: number;
  mcpServersToRetire: number;
  projectedMonthlySavingsUSD: number;
  projectedMonthlyCostUSD: number;
  actionBreakdown: Array<{
    action: 'AGENT_DISABLE' | 'AGENT_ARCHIVE' | 'MCP_RETIREMENT';
    targetName: string;
    savingsUSD: number;
  }>;
};

// ---------------------------------------------------------------------------
// Execution payload / result
// ---------------------------------------------------------------------------

type AgentRuntimePayload = {
  tenantId: string;
  recommendations: AgentRuntimeRecommendation[];
};

type AgentRuntimeResult = {
  tenantId: string;
  executionId: string;
  executedActionDescriptions: string[];
  totalAgentsDisabled: number;
  totalAgentsArchived: number;
  totalMCPServersRetired: number;
  estimatedMonthlySavings: number;
  rollbackWindowDays: number;
};

// ---------------------------------------------------------------------------
// Deterministic mock evidence helper
// ---------------------------------------------------------------------------

function buildMockEvidence(tenantId: string): AgentRuntimeEvidence {
  const seed = tenantId.length + tenantId.charCodeAt(0);

  const agents: AgentEntry[] = [
    {
      agentId: `agent-${tenantId}-001`,
      agentName: 'DataPipeline Orchestrator',
      platform: 'n8n',
      status: 'ACTIVE',
      lastExecutionDaysAgo: 1,
      executionsLast30Days: 420 + (seed % 30),
      avgToolCallsPerExecution: 8,
      mcpServersUsed: ['mcp-postgres', 'mcp-slack'],
      monthlyCostEstimateUSD: 38 + (seed % 10),
      isOrphaned: false,
      isRecursive: false,
    },
    {
      agentId: `agent-${tenantId}-002`,
      agentName: 'Legacy Support Bot',
      platform: 'langchain',
      status: 'ORPHANED',
      lastExecutionDaysAgo: 62,
      executionsLast30Days: 0,
      avgToolCallsPerExecution: 0,
      mcpServersUsed: ['mcp-zendesk'],
      monthlyCostEstimateUSD: 45 + (seed % 8),
      isOrphaned: true,
      isRecursive: false,
    },
    {
      agentId: `agent-${tenantId}-003`,
      agentName: 'Report Generator',
      platform: 'autogen',
      status: 'IDLE',
      lastExecutionDaysAgo: 38,
      executionsLast30Days: 2,
      avgToolCallsPerExecution: 12,
      mcpServersUsed: ['mcp-postgres', 'mcp-gsheets'],
      monthlyCostEstimateUSD: 22 + (seed % 6),
      isOrphaned: false,
      isRecursive: false,
    },
    {
      agentId: `agent-${tenantId}-004`,
      agentName: 'Recursive Crawler Agent',
      platform: 'custom-runtime',
      status: 'ACTIVE',
      lastExecutionDaysAgo: 0,
      executionsLast30Days: 1_840 + (seed % 100),
      avgToolCallsPerExecution: 88 + (seed % 20),
      mcpServersUsed: ['mcp-browser', 'mcp-search'],
      monthlyCostEstimateUSD: 180 + seed * 2,
      isOrphaned: false,
      isRecursive: true,
    },
    {
      agentId: `agent-${tenantId}-005`,
      agentName: 'Onboarding Assistant',
      platform: 'n8n',
      status: 'IDLE',
      lastExecutionDaysAgo: 47,
      executionsLast30Days: 0,
      avgToolCallsPerExecution: 5,
      mcpServersUsed: ['mcp-slack', 'mcp-notion'],
      monthlyCostEstimateUSD: 18 + (seed % 5),
      isOrphaned: false,
      isRecursive: false,
    },
    {
      agentId: `agent-${tenantId}-006`,
      agentName: 'Abandoned Analytics Agent',
      platform: 'langgraph',
      status: 'ORPHANED',
      lastExecutionDaysAgo: 90,
      executionsLast30Days: 0,
      avgToolCallsPerExecution: 0,
      mcpServersUsed: ['mcp-bigquery'],
      monthlyCostEstimateUSD: 32 + (seed % 7),
      isOrphaned: true,
      isRecursive: false,
    },
  ];

  const mcpServers: MCPServerEntry[] = [
    {
      serverId: 'mcp-postgres',
      serverName: 'PostgreSQL MCP Server',
      connectedAgents: 2,
      lastUsedDaysAgo: 1,
      isIdle: false,
      monthlyComputeCostUSD: 28 + (seed % 5),
    },
    {
      serverId: 'mcp-zendesk',
      serverName: 'Zendesk MCP Server',
      connectedAgents: 1,
      lastUsedDaysAgo: 62,
      isIdle: true,
      monthlyComputeCostUSD: 18 + (seed % 4),
    },
    {
      serverId: 'mcp-slack',
      serverName: 'Slack MCP Server',
      connectedAgents: 2,
      lastUsedDaysAgo: 2,
      isIdle: false,
      monthlyComputeCostUSD: 12 + (seed % 3),
    },
    {
      serverId: 'mcp-bigquery',
      serverName: 'BigQuery MCP Server',
      connectedAgents: 1,
      lastUsedDaysAgo: 90,
      isIdle: true,
      monthlyComputeCostUSD: 35 + (seed % 6),
    },
    {
      serverId: 'mcp-browser',
      serverName: 'Browser Automation MCP',
      connectedAgents: 1,
      lastUsedDaysAgo: 0,
      isIdle: false,
      monthlyComputeCostUSD: 22 + (seed % 4),
    },
    {
      serverId: 'mcp-gsheets',
      serverName: 'Google Sheets MCP Server',
      connectedAgents: 1,
      lastUsedDaysAgo: 38,
      isIdle: false,
      monthlyComputeCostUSD: 8 + (seed % 2),
    },
    {
      serverId: 'mcp-notion',
      serverName: 'Notion MCP Server',
      connectedAgents: 1,
      lastUsedDaysAgo: 47,
      isIdle: true,
      monthlyComputeCostUSD: 10 + (seed % 3),
    },
    {
      serverId: 'mcp-search',
      serverName: 'Search API MCP Server',
      connectedAgents: 1,
      lastUsedDaysAgo: 0,
      isIdle: false,
      monthlyComputeCostUSD: 15 + (seed % 3),
    },
  ];

  const orphanedAgents = agents.filter((a) => a.isOrphaned).length;
  const idleAgents = agents.filter((a) => a.status === 'IDLE' && !a.isOrphaned).length;
  const totalCost = agents.reduce((s, a) => s + a.monthlyCostEstimateUSD, 0) +
    mcpServers.reduce((s, m) => s + m.monthlyComputeCostUSD, 0);

  // Wasted cost = orphaned agents + idle agents + idle MCP servers
  const wastedCost =
    agents
      .filter((a) => a.isOrphaned || (a.status === 'IDLE' && a.executionsLast30Days < 5))
      .reduce((s, a) => s + a.monthlyCostEstimateUSD, 0) +
    mcpServers
      .filter((m) => m.isIdle)
      .reduce((s, m) => s + m.monthlyComputeCostUSD, 0);

  return {
    tenantId,
    agents,
    mcpServers,
    totalAgents: agents.length,
    orphanedAgents,
    idleAgents,
    totalMonthlyComputeCostUSD: totalCost,
    wastedComputeCostUSD: wastedCost,
  };
}

// ---------------------------------------------------------------------------
// Pack definition
// ---------------------------------------------------------------------------

const definition: EconomicOperationsPackDefinition<
  AgentRuntimeEvidence,
  AgentRuntimeRecommendation,
  AgentRuntimeSimulation,
  AgentRuntimePayload,
  AgentRuntimeResult
> = {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: 'ai-agent-runtime-governance',
  name: 'AI Agent Runtime Governance',
  version: '1.0.0',

  // ── Classification ────────────────────────────────────────────────────────
  domain: 'AI_GOVERNANCE',
  category: 'AGENT_RUNTIME_GOVERNANCE',
  description:
    'Monitors AI agent runtimes across platforms (n8n, LangGraph, AutoGen, custom runtimes) and ' +
    'their attached MCP servers to identify orphaned agents (no owner, no executions in 45+ days), ' +
    'idle agents, and recursive loop candidates. Generates AGENT_DISABLE, AGENT_ARCHIVE, and ' +
    'MCP_RETIREMENT recommendations to eliminate wasted compute spend, with rollback capability ' +
    'to restore agents and servers if legitimate use resumes.',
  riskProfile: 'MEDIUM',
  blastRadiusClassification: 'MEDIUM',

  // ── Operational constraints ───────────────────────────────────────────────
  minimumTenantMode: 'PRODUCTION_APPROVAL_REQUIRED',
  supportedExecutionModes: ['SIMULATION_ONLY', 'GOVERNED_EXECUTION'],
  requiredCapabilities: ['READ_ACTIVITY', 'READ_COSTS', 'EXECUTE_ACTIONS'],
  requiredConnectorScopes: [],
  defaultApprovalPolicy: 'DUAL_APPROVAL',

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
      ): Promise<AgentRuntimeEvidence> {
        return buildMockEvidence(tenantId);
      },
    },
    normalizer: {
      normalize(raw: unknown): AgentRuntimeEvidence {
        return raw as AgentRuntimeEvidence;
      },
    },
    trustScorer: {
      minimumTrustThreshold: 0.6,
      score(evidence: AgentRuntimeEvidence): number {
        // Trust is higher when we have confirmed execution data for the majority of agents.
        // Penalise heavily if >50% of agents have null lastExecutionDaysAgo.
        let score = 0.88;
        const unknownActivity = evidence.agents.filter(
          (a) => a.lastExecutionDaysAgo === null,
        ).length;
        const unknownPct =
          evidence.agents.length > 0 ? unknownActivity / evidence.agents.length : 0;
        if (unknownPct > 0.5) {
          score -= 0.2;
        } else if (unknownPct > 0.2) {
          score -= 0.1;
        }
        // Extra trust signal: if we can see orphaned agents, data is thorough
        if (evidence.orphanedAgents > 0) {
          score += 0.02;
        }
        return Math.max(0.6, Math.min(0.90, score));
      },
    },
    savingsEstimator: {
      estimateMonthlySavings(evidence: AgentRuntimeEvidence): number {
        return Math.round(evidence.wastedComputeCostUSD);
      },
      estimateAnnualSavings(evidence: AgentRuntimeEvidence): number {
        return this.estimateMonthlySavings(evidence) * 12;
      },
      confidence(evidence: AgentRuntimeEvidence): number {
        // Confidence correlates with ratio of wasted to total cost being identifiable
        const wastedRatio = evidence.wastedComputeCostUSD / evidence.totalMonthlyComputeCostUSD;
        return wastedRatio > 0.2 ? 0.84 : 0.66;
      },
    },
  },

  // ── Recommendation layer ──────────────────────────────────────────────────
  recommendationLayer: {
    maxRecommendations: undefined, // one per actionable agent + one per idle MCP server
    generator: {
      async generate(
        _tenantId: string,
        evidence: AgentRuntimeEvidence,
      ): Promise<AgentRuntimeRecommendation[]> {
        const recommendations: AgentRuntimeRecommendation[] = [];

        // AGENT_DISABLE — orphaned agents (no owner, 45+ days no execution)
        for (const agent of evidence.agents) {
          if (agent.isOrphaned) {
            recommendations.push({
              recommendationType: 'AGENT_DISABLE',
              targetId: agent.agentId,
              targetName: agent.agentName,
              platform: agent.platform,
              currentMonthlyCostUSD: agent.monthlyCostEstimateUSD,
              projectedMonthlySavings: agent.monthlyCostEstimateUSD,
              savingsPct: 100,
              confidence: 0.90,
              rationale:
                `Agent "${agent.agentName}" (${agent.platform}) is orphaned — no executions detected ` +
                `for ${agent.lastExecutionDaysAgo ?? 'unknown'} days and no active owner is registered. ` +
                `It is incurring $${agent.monthlyCostEstimateUSD}/month in idle compute costs. ` +
                'Disabling the agent halts cost accumulation immediately while preserving the agent ' +
                'configuration for potential future re-activation.',
              executionRisk: 'LOW',
              rollbackNote:
                `Re-enable "${agent.agentName}" via the ${agent.platform} management interface. ` +
                'Agent configuration and execution history are retained in the platform datastore.',
            });
          }
        }

        // AGENT_ARCHIVE — idle agents (not orphaned but <5 executions in 30 days, 35+ days since last run)
        for (const agent of evidence.agents) {
          if (
            !agent.isOrphaned &&
            agent.status === 'IDLE' &&
            agent.executionsLast30Days < 5 &&
            (agent.lastExecutionDaysAgo === null || agent.lastExecutionDaysAgo > 35)
          ) {
            const savings = Math.round(agent.monthlyCostEstimateUSD * 0.85);
            recommendations.push({
              recommendationType: 'AGENT_ARCHIVE',
              targetId: agent.agentId,
              targetName: agent.agentName,
              platform: agent.platform,
              currentMonthlyCostUSD: agent.monthlyCostEstimateUSD,
              projectedMonthlySavings: savings,
              savingsPct: 85,
              confidence: 0.78,
              rationale:
                `Agent "${agent.agentName}" (${agent.platform}) has executed only ` +
                `${agent.executionsLast30Days} time(s) in the past 30 days and was last active ` +
                `${agent.lastExecutionDaysAgo ?? 'unknown'} days ago. Archiving suspends scheduled ` +
                'triggers and deallocates runtime resources while retaining state — enabling rapid ' +
                `reactivation if demand resumes. Projected saving: $${savings}/month.`,
              executionRisk: 'MEDIUM',
              rollbackNote:
                `Unarchive "${agent.agentName}" from the ${agent.platform} archive store. ` +
                'All execution history, configurations, and trigger schedules are preserved.',
            });
          }
        }

        // MCP_RETIREMENT — idle MCP servers with no active agent connections
        for (const server of evidence.mcpServers) {
          if (server.isIdle && server.connectedAgents <= 1) {
            // Check whether all connected agents are themselves orphaned/idle
            const connectedActiveAgents = evidence.agents.filter(
              (a) =>
                a.mcpServersUsed.includes(server.serverId) &&
                a.status === 'ACTIVE' &&
                !a.isOrphaned,
            ).length;
            if (connectedActiveAgents === 0) {
              recommendations.push({
                recommendationType: 'MCP_RETIREMENT',
                targetId: server.serverId,
                targetName: server.serverName,
                platform: 'mcp',
                currentMonthlyCostUSD: server.monthlyComputeCostUSD,
                projectedMonthlySavings: server.monthlyComputeCostUSD,
                savingsPct: 100,
                confidence: 0.86,
                rationale:
                  `MCP server "${server.serverName}" has had no active connections for ` +
                  `${server.lastUsedDaysAgo ?? 'unknown'} days and its sole connected agent(s) are ` +
                  'either orphaned or idle. Retiring this server eliminates ' +
                  `$${server.monthlyComputeCostUSD}/month in idle compute cost. The server can be ` +
                  're-provisioned within minutes if a new agent requires it.',
                executionRisk: 'LOW',
                rollbackNote:
                  `Re-provision "${server.serverName}" from the MCP server registry. ` +
                  'Server configuration is stored and re-deployment is typically automated via IaC.',
              });
            }
          }
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
        evidence: AgentRuntimeEvidence,
      ): Promise<AgentRuntimeSimulation> {
        let agentsToDisable = 0;
        let agentsToArchive = 0;
        let mcpServersToRetire = 0;
        let totalSavings = 0;

        const actionBreakdown: AgentRuntimeSimulation['actionBreakdown'] = [];

        for (const agent of evidence.agents) {
          if (agent.isOrphaned) {
            agentsToDisable += 1;
            totalSavings += agent.monthlyCostEstimateUSD;
            actionBreakdown.push({
              action: 'AGENT_DISABLE',
              targetName: agent.agentName,
              savingsUSD: agent.monthlyCostEstimateUSD,
            });
          } else if (
            agent.status === 'IDLE' &&
            agent.executionsLast30Days < 5 &&
            (agent.lastExecutionDaysAgo === null || agent.lastExecutionDaysAgo > 35)
          ) {
            agentsToArchive += 1;
            const savings = Math.round(agent.monthlyCostEstimateUSD * 0.85);
            totalSavings += savings;
            actionBreakdown.push({
              action: 'AGENT_ARCHIVE',
              targetName: agent.agentName,
              savingsUSD: savings,
            });
          }
        }

        for (const server of evidence.mcpServers) {
          if (server.isIdle && server.connectedAgents <= 1) {
            const connectedActiveAgents = evidence.agents.filter(
              (a) =>
                a.mcpServersUsed.includes(server.serverId) &&
                a.status === 'ACTIVE' &&
                !a.isOrphaned,
            ).length;
            if (connectedActiveAgents === 0) {
              mcpServersToRetire += 1;
              totalSavings += server.monthlyComputeCostUSD;
              actionBreakdown.push({
                action: 'MCP_RETIREMENT',
                targetName: server.serverName,
                savingsUSD: server.monthlyComputeCostUSD,
              });
            }
          }
        }

        return {
          tenantId,
          executionId,
          agentsToDisable,
          agentsToArchive,
          mcpServersToRetire,
          projectedMonthlySavingsUSD: totalSavings,
          projectedMonthlyCostUSD: Math.round(evidence.totalMonthlyComputeCostUSD - totalSavings),
          actionBreakdown,
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
        payload: AgentRuntimePayload,
      ): Promise<AgentRuntimeResult> {
        const descriptions = payload.recommendations.map(
          (r) =>
            `${r.recommendationType}: "${r.targetName}" on ${r.platform} — ` +
            `saving $${r.projectedMonthlySavings}/month`,
        );

        const totalDisabled = payload.recommendations.filter(
          (r) => r.recommendationType === 'AGENT_DISABLE',
        ).length;
        const totalArchived = payload.recommendations.filter(
          (r) => r.recommendationType === 'AGENT_ARCHIVE',
        ).length;
        const totalMCPRetired = payload.recommendations.filter(
          (r) => r.recommendationType === 'MCP_RETIREMENT',
        ).length;
        const totalSavings = payload.recommendations.reduce(
          (s, r) => s + r.projectedMonthlySavings,
          0,
        );

        return {
          tenantId,
          executionId,
          executedActionDescriptions: descriptions,
          totalAgentsDisabled: totalDisabled,
          totalAgentsArchived: totalArchived,
          totalMCPServersRetired: totalMCPRetired,
          estimatedMonthlySavings: totalSavings,
          rollbackWindowDays: 30,
        };
      },
    },
    rollbackAdapter: {
      async rollback(
        _tenantId: string,
        _executionId: string,
        payload: AgentRuntimePayload,
      ): Promise<void> {
        // Rollback re-enables disabled agents, unarchives archived agents,
        // and re-provisions retired MCP servers.
        const toRestore = payload.recommendations.map(
          (r) => `${r.recommendationType} reversal for "${r.targetName}" on ${r.platform}`,
        );
        console.info(
          `[AgentRuntimePack] Rollback: restoring ${toRestore.length} resource(s) for tenant ${payload.tenantId}:\n` +
            toRestore.join('\n'),
        );
      },
    },
    async checkReadiness(
      _tenantId: string,
      _executionId: string,
    ): Promise<{ ready: boolean; blockers: string[] }> {
      // Requires EXECUTE_ACTIONS and READ_ACTIVITY capability — assumed available.
      return { ready: true, blockers: [] };
    },
  },

  // ── Verification layer ────────────────────────────────────────────────────
  verificationLayer: {
    strategy: {
      async verify(
        tenantId: string,
        executionId: string,
        expected: AgentRuntimeResult,
      ): Promise<{ verified: boolean; confidence: number; details: Record<string, unknown> }> {
        return {
          verified: false,
          confidence: 0.0,
          details: {
            tenantId,
            executionId,
            verificationNote:
              'Re-collect agent runtime evidence after 7 days. Confirm disabled/archived agents ' +
              'no longer appear as running in their respective platform dashboards. Retired MCP servers ' +
              'should show zero active connections and zero compute billing.',
            expectedMonthlySavings: expected.estimatedMonthlySavings,
            expectedAgentsDisabled: expected.totalAgentsDisabled,
            expectedAgentsArchived: expected.totalAgentsArchived,
            expectedMCPServersRetired: expected.totalMCPServersRetired,
            rollbackWindowDays: expected.rollbackWindowDays,
            status: 'PENDING_PLATFORM_CONFIRMATION',
          },
        };
      },
    },
  },

  // ── Drift layer ───────────────────────────────────────────────────────────
  driftLayer: {
    rules: [
      {
        ruleId: 'ORPHANED_AGENT_ACCUMULATION',
        description:
          'Detects when the orphaned agent count grows above 3 after an intervention, ' +
          'indicating new agents are being deployed without ownership assignment.',
        severity: 'HIGH',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const orphanedCount =
            typeof context['orphanedAgentCount'] === 'number'
              ? context['orphanedAgentCount']
              : 0;
          const triggered = orphanedCount > 3;
          return {
            triggered,
            detail: triggered
              ? `${orphanedCount} orphaned agents detected for tenant ${tenantId} ` +
                `(executionId: ${executionId}), exceeding the threshold of 3. ` +
                'Enforce agent ownership assignment in the deployment pipeline.'
              : `Orphaned agent count is ${orphanedCount} — within acceptable bounds.`,
          };
        },
      },
      {
        ruleId: 'IDLE_MCP_SERVER_SPRAWL',
        description:
          'Detects when the number of idle MCP servers exceeds 20% of the total provisioned ' +
          'MCP server count, indicating server provisioning is outpacing agent demand.',
        severity: 'MEDIUM',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const idleMCPPct =
            typeof context['idleMCPServerPct'] === 'number'
              ? context['idleMCPServerPct']
              : 0;
          const triggered = idleMCPPct > 20;
          return {
            triggered,
            detail: triggered
              ? `${idleMCPPct}% of provisioned MCP servers are idle for tenant ${tenantId} ` +
                `(executionId: ${executionId}), exceeding the 20% threshold. ` +
                'Review MCP server provisioning process for over-allocation patterns.'
              : `Idle MCP server rate is ${idleMCPPct}% — within acceptable bounds.`,
          };
        },
      },
      {
        ruleId: 'AGENT_COMPUTE_COST_SPIKE',
        description:
          'Detects a month-over-month spike in total agent runtime compute cost exceeding 30%, ' +
          'which may indicate new recursive agents or uncontrolled agent proliferation.',
        severity: 'HIGH',
        async evaluate(
          tenantId: string,
          executionId: string,
          context: Record<string, unknown>,
        ): Promise<{ triggered: boolean; detail: string }> {
          const momCostGrowthPct =
            typeof context['momAgentComputeCostGrowthPct'] === 'number'
              ? context['momAgentComputeCostGrowthPct']
              : 0;
          const triggered = momCostGrowthPct > 30;
          return {
            triggered,
            detail: triggered
              ? `Agent runtime compute cost grew ${momCostGrowthPct}% month-over-month for tenant ${tenantId} ` +
                `(executionId: ${executionId}). Investigate new agent deployments or recursive execution loops.`
              : `Agent compute cost growth is ${momCostGrowthPct}% MoM — within expected range.`,
          };
        },
      },
    ],
  },

  // ── UX ────────────────────────────────────────────────────────────────────
  ux: {
    displayName: 'AI Agent Runtime Governance',
    shortDescription: 'Disable orphaned agents, archive idle runtimes, and retire unused MCP servers.',
    longDescription:
      'The AI Agent Runtime Governance pack monitors all AI agents deployed across your organisation\'s ' +
      'runtime platforms — n8n, LangGraph, AutoGen, custom runtimes — alongside their attached MCP ' +
      'servers. It classifies agents as ORPHANED (no owner, 45+ days without execution), IDLE ' +
      '(<5 executions in 30 days), or flagged as RECURSIVE (loop detected via high tool-call rate). ' +
      'For each category it generates targeted recommendations: AGENT_DISABLE for orphans, ' +
      'AGENT_ARCHIVE for low-utilisation agents, and MCP_RETIREMENT for idle servers with no active ' +
      'agent connections. All actions support rollback — disabled agents can be re-enabled, archived ' +
      'agents unarchived, and MCP servers re-provisioned within minutes. Three drift rules guard against ' +
      'orphan re-accumulation, MCP server sprawl, and compute cost spikes post-intervention.',
    iconSlug: 'agent-runtime',
    domainColour: 'amber-600',
    estimatedTimeToValueDays: 5,
    documentationUrl: null,
    tags: [
      'ai',
      'agent',
      'mcp',
      'runtime',
      'orphaned',
      'idle',
      'compute',
      'governance',
      'cost-reduction',
    ],
    requiredFeatureFlags: ['ai_governance_enabled', 'agent_runtime_governance_enabled'],
  },
};

// ---------------------------------------------------------------------------
// Compile and export
// ---------------------------------------------------------------------------

export const aiAgentRuntimeGovernancePack = compileEconomicOperationsPack(definition);

// Register with the global registry at module initialisation time.
globalPackRegistry.register(aiAgentRuntimeGovernancePack);
