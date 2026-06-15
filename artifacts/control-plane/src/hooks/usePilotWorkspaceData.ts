import { useCallback, useEffect, useMemo, useState } from "react";
import { liveFetch, normalizeApiError } from "../lib/liveApi";
import { useWorkspace } from "../lib/workspaceContext";
import type { PilotWorkspaceSummary } from "../types/pilotWorkspace";
export const pilotWorkspaceApiPaths = [
  "/api/workspace/pilot-summary",
  "/api/workspace/pilot-summary/audit",
];
export const unavailable = "Not available";
const now = () => new Date().toISOString();
export function demoPilotWorkspaceSummary(
  tenantId = "demo-sandbox-tenant",
): PilotWorkspaceSummary {
  return {
    tenantId,
    mode: "DEMO",
    generatedAt: now(),
    demoBanner: {
      visible: true,
      label: "Demo data",
      description:
        "Sample tenant showing the complete Certen story. No production systems are connected.",
    },
    tenantReadiness: {
      overallStatus: "DEMO",
      items: [
        ["connector", "Connector readiness"],
        ["authority", "Authority readiness"],
        ["graph", "Economic graph readiness"],
        ["commercial", "Commercial coverage"],
        ["financial", "Financial truth coverage"],
        ["ownership", "Ownership completeness"],
        ["evidence", "Evidence coverage"],
        ["outcomeFinance", "Outcome finance readiness"],
      ].map(([key, label]) => ({
        key,
        label,
        status: "DEMO" as const,
        score: 92,
        reason: "Demo data for design-partner walkthrough",
        nextStep: "Connect live sources to replace sample data",
      })),
    },
    executiveValue: {
      projectedValue: 420000,
      approvedValue: 210000,
      executedValue: 128000,
      financeVerifiedValue: 96000,
      varianceAmount: -32000,
      variancePercent: -25,
      currency: "USD",
      confidence: "HIGH",
      status: "AVAILABLE",
    },
    commercialPosition: {
      vendorCount: 8,
      contractCount: 12,
      entitlementCount: 21,
      commitmentCount: 4,
      renewalCount: 5,
      commercialExposureValue: 180000,
      blockedSavingsValue: 42000,
      renewalLeverage: "HIGH",
      status: "AVAILABLE",
    },
    financialTruth: {
      costCentreCount: 5,
      invoiceCount: 44,
      purchaseOrderCount: 18,
      vendorSpendCount: 8,
      reconciliationCount: 6,
      verifiedSavings: 96000,
      unverifiedSavings: 32000,
      status: "AVAILABLE",
    },
    ownershipCoverage: {
      completenessScore: 88,
      missingOwners: 2,
      missingCostCentres: 1,
      missingExecutiveOwners: 1,
      approvalRoutesReady: 7,
      approvalRoutesBlocked: 1,
      status: "AVAILABLE",
    },
    actionSnapshot: {
      ready: 4,
      awaitingApproval: 3,
      scheduled: 2,
      completed: 8,
      blocked: 1,
      status: "AVAILABLE",
    },
    evidenceTrust: {
      evidencePackCount: 9,
      evidenceCoverageScore: 86,
      trustReadinessScore: 82,
      financeEvidenceCount: 6,
      outcomeEvidenceCount: 5,
      status: "AVAILABLE",
    },
    graphHealth: {
      nodeCount: 42,
      edgeCount: 68,
      economicControlChainAudit: "PASS",
      disconnectedCriticalObjects: 0,
      status: "AVAILABLE",
    },
    nextSteps: [
      {
        priority: "HIGH",
        title: "Review finance verified savings",
        description:
          "Use demo evidence to walk through verified value with the design partner.",
        targetArea: "FINANCIAL_TRUTH",
      },
      {
        priority: "MEDIUM",
        title: "Assign remaining owners",
        description:
          "Complete owner and executive-owner coverage before live rollout.",
        targetArea: "OWNERSHIP",
      },
    ],
  };
}
export function liveEmptyPilotWorkspaceSummary(
  tenantId = "live-tenant",
): PilotWorkspaceSummary {
  return {
    tenantId,
    mode: "LIVE",
    generatedAt: now(),
    tenantReadiness: {
      overallStatus: "MISSING",
      items: [
        {
          key: "commercial",
          label: "Commercial coverage",
          status: "MISSING",
          reason: "Commercial position unavailable.",
          nextStep: "Import contracts or connect commercial source.",
        },
        {
          key: "financial",
          label: "Financial truth coverage",
          status: "MISSING",
          reason: "Financial truth unavailable.",
          nextStep: "Connect ERP/AP source or upload invoice data.",
        },
        {
          key: "ownership",
          label: "Ownership completeness",
          status: "MISSING",
          reason: "Ownership coverage unavailable.",
          nextStep: "Import ownership map or connect identity/HR source.",
        },
        {
          key: "outcomeFinance",
          label: "Outcome finance readiness",
          status: "MISSING",
          reason: "Verified value unavailable.",
          nextStep: "Link executed outcomes to finance reconciliation.",
        },
        {
          key: "graph",
          label: "Economic graph readiness",
          status: "MISSING",
          reason: "Economic graph unavailable.",
          nextStep: "Run discovery or import portfolio data.",
        },
      ],
    },
    executiveValue: { confidence: "UNAVAILABLE", status: "UNAVAILABLE" },
    commercialPosition: {
      vendorCount: 0,
      contractCount: 0,
      entitlementCount: 0,
      commitmentCount: 0,
      renewalCount: 0,
      renewalLeverage: "UNAVAILABLE",
      status: "UNAVAILABLE",
    },
    financialTruth: {
      costCentreCount: 0,
      invoiceCount: 0,
      purchaseOrderCount: 0,
      vendorSpendCount: 0,
      reconciliationCount: 0,
      status: "UNAVAILABLE",
    },
    ownershipCoverage: {
      missingOwners: 0,
      missingCostCentres: 0,
      missingExecutiveOwners: 0,
      approvalRoutesReady: 0,
      approvalRoutesBlocked: 0,
      status: "UNAVAILABLE",
    },
    actionSnapshot: {
      ready: 0,
      awaitingApproval: 0,
      scheduled: 0,
      completed: 0,
      blocked: 0,
      status: "UNAVAILABLE",
    },
    evidenceTrust: { evidencePackCount: 0, status: "UNAVAILABLE" },
    graphHealth: {
      nodeCount: 0,
      edgeCount: 0,
      economicControlChainAudit: "UNAVAILABLE",
      status: "UNAVAILABLE",
    },
    nextSteps: [
      {
        priority: "HIGH",
        title: "Import commercial records",
        description:
          "Commercial position unavailable. Import contracts or connect commercial source.",
        targetArea: "COMMERCIAL",
      },
      {
        priority: "HIGH",
        title: "Connect financial truth",
        description:
          "Financial truth unavailable. Connect ERP/AP source or upload invoice data.",
        targetArea: "FINANCIAL_TRUTH",
      },
      {
        priority: "MEDIUM",
        title: "Import ownership map",
        description:
          "Ownership coverage unavailable. Import ownership map or connect identity/HR source.",
        targetArea: "OWNERSHIP",
      },
      {
        priority: "HIGH",
        title: "Link outcomes to finance",
        description:
          "Verified value unavailable. Link executed outcomes to finance reconciliation.",
        targetArea: "FINANCIAL_TRUTH",
      },
      {
        priority: "MEDIUM",
        title: "Populate economic graph",
        description:
          "Economic graph unavailable. Run discovery or import portfolio data.",
        targetArea: "GRAPH",
      },
    ],
  };
}
export function buildPilotWorkspaceData(sources: any) {
  return sources?.workspace?.mode === "live" ||
    sources?.runtime?.environment === "LIVE"
    ? liveEmptyPilotWorkspaceSummary(
        sources?.workspace?.tenantId ?? "live-tenant",
      )
    : demoPilotWorkspaceSummary(
        sources?.workspace?.tenantId ?? "demo-sandbox-tenant",
      );
}
export function usePilotWorkspaceData() {
  const workspace = useWorkspace();
  const initial =
    workspace.mode === "demo"
      ? demoPilotWorkspaceSummary(workspace.tenantId)
      : liveEmptyPilotWorkspaceSummary(workspace.tenantId);
  const [summary, setSummary] = useState<PilotWorkspaceSummary>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next =
        workspace.mode === "demo"
          ? demoPilotWorkspaceSummary(workspace.tenantId)
          : await liveFetch<PilotWorkspaceSummary>(
              "/api/workspace/pilot-summary",
            );
      setSummary(next);
      setError(null);
      return next;
    } catch (err) {
      const next = normalizeApiError(err);
      setError(next);
      if (workspace.mode === "live")
        setSummary(liveEmptyPilotWorkspaceSummary(workspace.tenantId));
      throw next;
    } finally {
      setLoading(false);
    }
  }, [workspace.mode, workspace.tenantId]);
  useEffect(() => {
    void refresh().catch(() => undefined);
  }, [refresh]);
  return useMemo(
    () => ({ summary, loading, error, refresh }),
    [summary, loading, error, refresh],
  );
}
