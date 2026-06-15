import { Shell } from "../components/layout/Shell";
import {
  EmptyState,
  ExecutivePageHeader,
  ExecutiveSection,
  MetricCard,
  StatusChip,
  type StatusChipTone,
} from "../components/executive";
import {
  usePilotWorkspaceData,
  unavailable,
} from "../hooks/usePilotWorkspaceData";
import type {
  PilotWorkspaceSummary,
  SummaryStatus,
} from "../types/pilotWorkspace";
const money = (value?: number, currency = "USD") =>
  value === undefined
    ? unavailable
    : new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
const date = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
};
const tone = (status: string): StatusChipTone =>
  /BLOCK|MISSING|UNAVAILABLE|LOW|FAIL/i.test(status)
    ? "danger"
    : /PARTIAL|WARN|MEDIUM|PENDING|AWAITING/i.test(status)
      ? "warning"
      : /READY|AVAILABLE|HIGH|PASS|VERIFIED/i.test(status)
        ? "success"
        : "info";
function statusText(status: SummaryStatus) {
  return status === "UNAVAILABLE" ? "Not connected" : status;
}
function MiniMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div
      style={{ border: "var(--border-default)", borderRadius: 12, padding: 12 }}
    >
      <div
        style={{
          color: "var(--text-tertiary)",
          fontSize: 11,
          textTransform: "uppercase",
          letterSpacing: ".08em",
        }}
      >
        {label}
      </div>
      <strong style={{ display: "block", marginTop: 6 }}>{value}</strong>
    </div>
  );
}
function Missing({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <EmptyState title={title} description={description} />
    </div>
  );
}
export function renderPilotWorkspaceSummary(summary: PilotWorkspaceSummary) {
  return {
    demoBanner: summary.demoBanner?.visible ? summary.demoBanner.label : "",
    financeVerified: money(
      summary.executiveValue.financeVerifiedValue,
      summary.executiveValue.currency,
    ),
    commercialUnavailable: summary.commercialPosition.status === "UNAVAILABLE",
    financialUnavailable: summary.financialTruth.status === "UNAVAILABLE",
    ownershipUnavailable: summary.ownershipCoverage.status === "UNAVAILABLE",
    nextStepCount: summary.nextSteps.length,
  };
}
export default function PilotWorkspace() {
  const { summary } = usePilotWorkspaceData();
  const currency = summary.executiveValue.currency ?? "USD";
  const valueUnavailable = summary.executiveValue.status === "UNAVAILABLE";
  return (
    <Shell>
      <main
        style={{
          padding: "24px clamp(18px,3vw,34px)",
          display: "grid",
          gap: 16,
          maxWidth: 1480,
          margin: "0 auto",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <ExecutivePageHeader
          title="Workspace Control Center"
          subtitle="One customer-facing workspace for tenant readiness, value, risk, ownership, evidence, and finance-verified savings."
          chips={[
            {
              label: `Mode: ${summary.mode === "DEMO" ? "Demo" : "Live"}`,
              tone: summary.mode === "DEMO" ? "info" : "warning",
            },
            { label: `Updated ${date(summary.generatedAt)}`, tone: "info" },
            {
              label: `Economic control chain ${summary.graphHealth.economicControlChainAudit}`,
              tone: tone(summary.graphHealth.economicControlChainAudit),
            },
          ]}
        />
        {summary.demoBanner?.visible && (
          <div
            data-testid="demo-banner"
            style={{
              border: "1px solid rgba(45,212,191,.24)",
              background: "rgba(45,212,191,.08)",
              borderRadius: 14,
              padding: 12,
            }}
          >
            <strong>{summary.demoBanner.label}</strong>
            <span style={{ marginLeft: 8, color: "var(--text-secondary)" }}>
              {summary.demoBanner.description}
            </span>
          </div>
        )}
        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(220px,1fr))",
            gap: 12,
          }}
        >
          <MetricCard
            label="Tenant readiness"
            value={summary.tenantReadiness.overallStatus}
            description="Connector, authority, commercial, financial, ownership, evidence, outcome finance, and graph readiness."
            tone={tone(summary.tenantReadiness.overallStatus)}
          />
          <MetricCard
            label="Finance verified value"
            value={money(summary.executiveValue.financeVerifiedValue, currency)}
            description={
              valueUnavailable
                ? "Not available until executed outcomes are linked to finance reconciliation."
                : "Finance reconciled value backed by evidence."
            }
            tone={valueUnavailable ? "danger" : "success"}
            href="/executive-value"
          />
          <MetricCard
            label="Economic control chain audit"
            value={summary.graphHealth.economicControlChainAudit}
            description="Audit status for graph-linked commercial, financial, ownership, outcome finance, evidence, and events."
            tone={tone(summary.graphHealth.economicControlChainAudit)}
          />
        </section>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <ExecutiveSection testId="tenant-readiness" title="Tenant Readiness">
            <div style={{ display: "grid", gap: 8 }}>
              {summary.tenantReadiness.items.map((i) => (
                <div
                  key={i.key}
                  style={{ borderTop: "var(--border-default)", paddingTop: 8 }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 8,
                    }}
                  >
                    <strong>{i.label}</strong>
                    <StatusChip label={i.status} tone={tone(i.status)} />
                  </div>
                  {i.score !== undefined && (
                    <div
                      style={{ fontSize: 12, color: "var(--text-secondary)" }}
                    >
                      Score {i.score}
                    </div>
                  )}
                  <p
                    style={{
                      margin: "6px 0 0",
                      color: "var(--text-secondary)",
                      fontSize: 12,
                    }}
                  >
                    {i.reason}
                  </p>
                  <p
                    style={{
                      margin: "3px 0 0",
                      color: "var(--teal)",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    Next step: {i.nextStep}
                  </p>
                </div>
              ))}
            </div>
          </ExecutiveSection>
          <ExecutiveSection
            testId="executive-value-summary"
            title="Executive Value Summary"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <MiniMetric
                label="Projected value"
                value={money(summary.executiveValue.projectedValue, currency)}
              />
              <MiniMetric
                label="Approved value"
                value={money(summary.executiveValue.approvedValue, currency)}
              />
              <MiniMetric
                label="Executed value"
                value={money(summary.executiveValue.executedValue, currency)}
              />
              <MiniMetric
                label="Finance verified value"
                value={money(
                  summary.executiveValue.financeVerifiedValue,
                  currency,
                )}
              />
              <MiniMetric
                label="Variance"
                value={money(summary.executiveValue.varianceAmount, currency)}
              />
              <MiniMetric
                label="Confidence"
                value={summary.executiveValue.confidence}
              />
            </div>
            {valueUnavailable && (
              <Missing
                title="Verified value unavailable"
                description="Next step: Link executed outcomes to finance reconciliation."
              />
            )}
          </ExecutiveSection>
          <ExecutiveSection testId="graph-health" title="Economic Graph Health">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <MiniMetric
                label="Node count"
                value={summary.graphHealth.nodeCount}
              />
              <MiniMetric
                label="Edge count"
                value={summary.graphHealth.edgeCount}
              />
              <MiniMetric
                label="Path health"
                value={statusText(summary.graphHealth.status)}
              />
              <MiniMetric
                label="Disconnected critical objects"
                value={
                  summary.graphHealth.disconnectedCriticalObjects ?? unavailable
                }
              />
            </div>
            {summary.graphHealth.status === "UNAVAILABLE" && (
              <Missing
                title="Economic graph unavailable"
                description="Next step: Run discovery or import portfolio data."
              />
            )}
          </ExecutiveSection>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <ExecutiveSection
            testId="commercial-position"
            title="Commercial Position"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <MiniMetric
                label="Vendors"
                value={summary.commercialPosition.vendorCount}
              />
              <MiniMetric
                label="Contracts"
                value={summary.commercialPosition.contractCount}
              />
              <MiniMetric
                label="Entitlements"
                value={summary.commercialPosition.entitlementCount}
              />
              <MiniMetric
                label="Commitments"
                value={summary.commercialPosition.commitmentCount}
              />
              <MiniMetric
                label="Renewals"
                value={summary.commercialPosition.renewalCount}
              />
              <MiniMetric
                label="Renewal leverage"
                value={
                  summary.commercialPosition.renewalLeverage ?? "UNAVAILABLE"
                }
              />
            </div>
            {summary.commercialPosition.status === "UNAVAILABLE" && (
              <Missing
                title="Commercial position unavailable"
                description="Next step: Import contracts or connect commercial source."
              />
            )}
          </ExecutiveSection>
          <ExecutiveSection testId="financial-truth" title="Financial Truth">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <MiniMetric
                label="Cost centres"
                value={summary.financialTruth.costCentreCount}
              />
              <MiniMetric
                label="Invoices"
                value={summary.financialTruth.invoiceCount}
              />
              <MiniMetric
                label="Purchase orders"
                value={summary.financialTruth.purchaseOrderCount}
              />
              <MiniMetric
                label="Vendor spend"
                value={summary.financialTruth.vendorSpendCount}
              />
              <MiniMetric
                label="Finance reconciliations"
                value={summary.financialTruth.reconciliationCount}
              />
              <MiniMetric
                label="Verified savings"
                value={money(summary.financialTruth.verifiedSavings, currency)}
              />
            </div>
            {summary.financialTruth.status === "UNAVAILABLE" && (
              <Missing
                title="Financial truth unavailable"
                description="Next step: Connect ERP/AP source or upload invoice data."
              />
            )}
          </ExecutiveSection>
          <ExecutiveSection
            testId="ownership-coverage"
            title="Ownership Coverage"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <MiniMetric
                label="Completeness"
                value={
                  summary.ownershipCoverage.completenessScore === undefined
                    ? unavailable
                    : `${summary.ownershipCoverage.completenessScore}%`
                }
              />
              <MiniMetric
                label="Missing owners"
                value={summary.ownershipCoverage.missingOwners}
              />
              <MiniMetric
                label="Missing cost centres"
                value={summary.ownershipCoverage.missingCostCentres}
              />
              <MiniMetric
                label="Missing exec owners"
                value={summary.ownershipCoverage.missingExecutiveOwners}
              />
              <MiniMetric
                label="Routes ready"
                value={summary.ownershipCoverage.approvalRoutesReady}
              />
              <MiniMetric
                label="Routes blocked"
                value={summary.ownershipCoverage.approvalRoutesBlocked}
              />
            </div>
            {summary.ownershipCoverage.status === "UNAVAILABLE" && (
              <Missing
                title="Ownership coverage unavailable"
                description="Next step: Import ownership map or connect identity/HR source."
              />
            )}
          </ExecutiveSection>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,minmax(0,1fr))",
            gap: 16,
          }}
        >
          <ExecutiveSection
            testId="action-approval-snapshot"
            title="Actions & Approvals"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <MiniMetric
                label="Ready actions"
                value={summary.actionSnapshot.ready}
              />
              <MiniMetric
                label="Awaiting approval"
                value={summary.actionSnapshot.awaitingApproval}
              />
              <MiniMetric
                label="Scheduled actions"
                value={summary.actionSnapshot.scheduled}
              />
              <MiniMetric
                label="Completed actions"
                value={summary.actionSnapshot.completed}
              />
              <MiniMetric
                label="Blocked actions"
                value={summary.actionSnapshot.blocked}
              />
              <MiniMetric
                label="Status"
                value={statusText(summary.actionSnapshot.status)}
              />
            </div>
          </ExecutiveSection>
          <ExecutiveSection testId="evidence-trust" title="Evidence & Trust">
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 10,
              }}
            >
              <MiniMetric
                label="Evidence packs"
                value={summary.evidenceTrust.evidencePackCount}
              />
              <MiniMetric
                label="Evidence coverage"
                value={
                  summary.evidenceTrust.evidenceCoverageScore === undefined
                    ? unavailable
                    : `${summary.evidenceTrust.evidenceCoverageScore}%`
                }
              />
              <MiniMetric
                label="Trust readiness"
                value={
                  summary.evidenceTrust.trustReadinessScore === undefined
                    ? unavailable
                    : `${summary.evidenceTrust.trustReadinessScore}%`
                }
              />
              <MiniMetric
                label="Finance evidence"
                value={
                  summary.evidenceTrust.financeEvidenceCount ?? unavailable
                }
              />
              <MiniMetric
                label="Outcome evidence"
                value={
                  summary.evidenceTrust.outcomeEvidenceCount ?? unavailable
                }
              />
              <MiniMetric
                label="Status"
                value={statusText(summary.evidenceTrust.status)}
              />
            </div>
          </ExecutiveSection>
          <ExecutiveSection testId="next-steps" title="Recommended Next Steps">
            {summary.nextSteps.length === 0 ? (
              <EmptyState
                title="No immediate next steps"
                description="Workspace data is ready for review."
              />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {summary.nextSteps.map((step) => (
                  <div
                    key={`${step.targetArea}-${step.title}`}
                    style={{
                      border: "var(--border-default)",
                      borderRadius: 12,
                      padding: 12,
                    }}
                  >
                    <StatusChip
                      label={step.priority}
                      tone={
                        step.priority === "HIGH"
                          ? "danger"
                          : step.priority === "MEDIUM"
                            ? "warning"
                            : "info"
                      }
                    />
                    <strong style={{ display: "block", marginTop: 8 }}>
                      {step.title}
                    </strong>
                    <p
                      style={{
                        margin: "4px 0 0",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {step.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </ExecutiveSection>
        </div>
      </main>
    </Shell>
  );
}
