import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveTenantOnboardingAuthorityData, type OnboardingStage, type OnboardingStageStatus, type OnboardingBlocker, type TenantNextAction } from "../hooks/useLiveTenantOnboardingAuthorityData";

// ─── Primitives ───────────────────────────────────────────────────────────────

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">{children}</h2>;
}

function StatusBadge({ status }: { status: string }) {
  const colours: Record<string, string> = {
    COMPLETE: "bg-green-100 text-green-800",
    IN_PROGRESS: "bg-blue-100 text-blue-800",
    BLOCKED: "bg-red-100 text-red-800",
    NOT_STARTED: "bg-gray-100 text-gray-600",
    READY_FOR_PILOT: "bg-yellow-100 text-yellow-800",
    READY_FOR_PRODUCTION: "bg-green-100 text-green-800",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colours[status] ?? "bg-gray-100 text-gray-600"}`}>{status.replace(/_/g, " ")}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colours: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-800",
    HIGH: "bg-orange-100 text-orange-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    LOW: "bg-blue-100 text-blue-800",
  };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colours[severity] ?? "bg-gray-100 text-gray-600"}`}>{severity}</span>;
}

function ProgressBar({ value, max = 100, color = "bg-blue-500" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Stage Card ───────────────────────────────────────────────────────────────

const STAGE_LABELS: Record<OnboardingStage, string> = {
  DISCOVER: "1. Discover",
  CONNECT: "2. Connect",
  VALIDATE: "3. Validate",
  TRUST: "4. Trust",
  READINESS: "5. Readiness",
  CERTIFY: "6. Certify",
  EXECUTE: "7. Execute",
  VERIFY: "8. Verify",
  PROTECT: "9. Protect",
  PROVE: "10. Prove",
};

function StageCard({ stage, isCurrent }: { stage: OnboardingStageStatus; isCurrent: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`border rounded-lg p-3 cursor-pointer transition-shadow ${isCurrent ? "border-blue-400 shadow-md" : "border-gray-200"} ${stage.completed ? "bg-green-50" : stage.status === "BLOCKED" ? "bg-red-50" : "bg-white"}`}
      onClick={() => setOpen((v) => !v)}
      data-testid={`stage-card-${stage.stage}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${stage.completed ? "bg-green-500 text-white" : stage.status === "BLOCKED" ? "bg-red-500 text-white" : "bg-gray-300 text-gray-700"}`}>
            {stage.completed ? "✓" : stage.status === "BLOCKED" ? "!" : "–"}
          </span>
          <span className="text-sm font-medium">{STAGE_LABELS[stage.stage]}</span>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={stage.status} />
          <span className="text-xs text-gray-500">{stage.score}%</span>
        </div>
      </div>
      <div className="mt-2">
        <ProgressBar value={stage.score} color={stage.completed ? "bg-green-500" : stage.status === "BLOCKED" ? "bg-red-500" : "bg-blue-500"} />
      </div>
      {open && (
        <div className="mt-3 text-xs text-gray-600 space-y-1">
          {stage.requiredActions.length > 0 && (
            <div><span className="font-medium">Required: </span>{stage.requiredActions.join(", ")}</div>
          )}
          {stage.blockers.length > 0 && (
            <div><span className="font-medium text-red-600">Blockers: </span>{stage.blockers.join(", ")}</div>
          )}
          {stage.completedAt && (
            <div><span className="font-medium">Completed: </span>{new Date(stage.completedAt).toLocaleDateString()}</div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Blocker Row ──────────────────────────────────────────────────────────────

function BlockerRow({ blocker }: { blocker: OnboardingBlocker }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-2 pr-4 text-xs">{STAGE_LABELS[blocker.stage]}</td>
      <td className="py-2 pr-4"><SeverityBadge severity={blocker.severity} /></td>
      <td className="py-2 pr-4 text-sm font-medium">{blocker.title}</td>
      <td className="py-2 text-xs text-gray-600">{blocker.resolutionAction}</td>
    </tr>
  );
}

// ─── Next Action Row ──────────────────────────────────────────────────────────

function NextActionRow({ action }: { action: TenantNextAction }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="py-2 pr-4 text-xs font-bold text-gray-500">#{action.priority}</td>
      <td className="py-2 pr-4 text-sm font-medium">{action.title}</td>
      <td className="py-2 pr-4 text-xs text-gray-600">{action.description}</td>
      <td className="py-2 pr-4 text-xs">{STAGE_LABELS[action.stage]}</td>
      <td className="py-2 text-xs">{action.link ? <a href={action.link} className="text-blue-600 underline">{action.link}</a> : "—"}</td>
    </tr>
  );
}

// ─── Narrative ────────────────────────────────────────────────────────────────

function buildNarrative(authority: ReturnType<typeof useLiveTenantOnboardingAuthorityData>["authority"], summary: ReturnType<typeof useLiveTenantOnboardingAuthorityData>["summary"]): string {
  const completed = authority.stages.filter((s) => s.completed).length;
  const status = authority.overallStatus.replace(/_/g, " ").toLowerCase();
  const score = authority.readinessScore;
  const pilot = summary.tenantsReadyForPilot;
  const prod = summary.tenantsReadyForProduction;

  return `This tenant has completed ${completed} of 10 onboarding stages and is currently ${status} with a readiness score of ${score}. ` +
    `${pilot > 0 ? "The tenant is ready for pilot." : prod > 0 ? "The tenant is ready for production." : "Additional stages must be completed before live deployment."} ` +
    `Trust score is ${authority.trustScore}. Active blockers: ${authority.blockers.filter((b) => !b.resolved).length}.`;
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function LiveTenantOnboardingAuthorityView() {
  const { authority, nextActions, firstOutcome, summary, isDemo, isLoading, triggerEvaluate } = useLiveTenantOnboardingAuthorityData();

  if (isLoading) return <div className="p-8 text-gray-500">Loading onboarding authority...</div>;

  const narrative = buildNarrative(authority, summary);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Tenant Onboarding Authority</h1>
          <p className="text-sm text-gray-500 mt-1">10-stage canonical onboarding journey: Discover → Connect → Validate → Trust → Readiness → Certify → Execute → Verify → Protect → Prove</p>
        </div>
        {isDemo && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-medium">Demo Mode</span>}
        <button
          onClick={triggerEvaluate}
          disabled={isDemo}
          className="text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          data-testid="evaluate-button"
        >
          Re-Evaluate
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <Card>
          <div className="text-xs text-gray-500">Overall Status</div>
          <div className="mt-1"><StatusBadge status={authority.overallStatus} /></div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Readiness Score</div>
          <div className="text-xl font-bold mt-1">{authority.readinessScore}<span className="text-sm font-normal text-gray-400">/100</span></div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Trust Score</div>
          <div className="text-xl font-bold mt-1">{authority.trustScore}<span className="text-sm font-normal text-gray-400">/100</span></div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Progress</div>
          <div className="text-xl font-bold mt-1">{authority.progressPercent}<span className="text-sm font-normal text-gray-400">%</span></div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Current Stage</div>
          <div className="text-sm font-bold mt-1">{STAGE_LABELS[authority.currentStage]}</div>
        </Card>
        <Card>
          <div className="text-xs text-gray-500">Active Blockers</div>
          <div className="text-xl font-bold mt-1 text-red-600">{authority.blockers.filter((b) => !b.resolved).length}</div>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <SectionLabel>Overall Onboarding Progress</SectionLabel>
        <div className="mb-2 flex justify-between text-xs text-gray-500">
          <span>Discover</span>
          <span>{authority.progressPercent}% complete</span>
          <span>Prove</span>
        </div>
        <ProgressBar value={authority.progressPercent} color="bg-blue-600" />
      </Card>

      {/* 10-Stage Journey */}
      <Card>
        <SectionLabel>10-Stage Journey</SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {authority.stages.map((stage) => (
            <StageCard
              key={stage.stage}
              stage={stage}
              isCurrent={stage.stage === authority.currentStage}
            />
          ))}
        </div>
      </Card>

      {/* Readiness Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <SectionLabel>Readiness Summary</SectionLabel>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500 text-xs">Ready for Pilot</td><td className="py-1.5 font-semibold">{summary.tenantsReadyForPilot > 0 ? "Yes" : "No"}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500 text-xs">Ready for Production</td><td className="py-1.5 font-semibold">{summary.tenantsReadyForProduction > 0 ? "Yes" : "No"}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500 text-xs">Avg. Readiness Score</td><td className="py-1.5 font-semibold">{summary.averageReadinessScore}</td></tr>
              <tr className="border-b border-gray-100"><td className="py-1.5 text-gray-500 text-xs">Avg. Trust Score</td><td className="py-1.5 font-semibold">{summary.averageTrustScore}</td></tr>
              <tr><td className="py-1.5 text-gray-500 text-xs">First Outcome Ready</td><td className="py-1.5 font-semibold">{summary.firstOutcomeReadyTenants > 0 ? "Yes" : "No"}</td></tr>
            </tbody>
          </table>
        </Card>

        <Card>
          <SectionLabel>First Outcome Readiness</SectionLabel>
          <div className="flex items-center gap-2 mb-3">
            <span className={`text-2xl font-bold ${firstOutcome.ready ? "text-green-600" : "text-orange-500"}`}>
              {firstOutcome.ready ? "Ready" : "Not Ready"}
            </span>
          </div>
          <div className="space-y-1 text-xs text-gray-600">
            <div><span className="font-medium">Projected Value: </span>${firstOutcome.projectedValue.toLocaleString()}</div>
            <div><span className="font-medium">Executable Actions: </span>{firstOutcome.firstExecutableActions.length}</div>
            <div><span className="font-medium">Pending Approvals: </span>{firstOutcome.requiredApprovals.length}</div>
            {firstOutcome.readinessIssues.length > 0 && (
              <div className="mt-2 text-red-600"><span className="font-medium">Issues: </span>{firstOutcome.readinessIssues.join("; ")}</div>
            )}
          </div>
        </Card>
      </div>

      {/* Blockers */}
      {authority.blockers.filter((b) => !b.resolved).length > 0 && (
        <Card>
          <SectionLabel>Active Blockers</SectionLabel>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400 uppercase"><th className="text-left pb-2 pr-4">Stage</th><th className="text-left pb-2 pr-4">Severity</th><th className="text-left pb-2 pr-4">Issue</th><th className="text-left pb-2">Resolution</th></tr></thead>
            <tbody>
              {authority.blockers.filter((b) => !b.resolved).map((b) => <BlockerRow key={b.id} blocker={b} />)}
            </tbody>
          </table>
        </Card>
      )}

      {/* Common Blockers */}
      {summary.commonBlockers.length > 0 && (
        <Card>
          <SectionLabel>Common Blockers</SectionLabel>
          <ul className="space-y-1 text-sm text-gray-700">
            {summary.commonBlockers.map((b, i) => <li key={i} className="flex items-center gap-2"><span className="text-red-500">•</span>{b}</li>)}
          </ul>
        </Card>
      )}

      {/* Next Actions */}
      <Card>
        <SectionLabel>Next Recommended Actions</SectionLabel>
        {nextActions.length === 0 ? (
          <p className="text-sm text-gray-500">No actions required — all stages complete.</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-400 uppercase"><th className="text-left pb-2 pr-4">#</th><th className="text-left pb-2 pr-4">Action</th><th className="text-left pb-2 pr-4">Description</th><th className="text-left pb-2 pr-4">Stage</th><th className="text-left pb-2">Link</th></tr></thead>
            <tbody>
              {nextActions.map((a) => <NextActionRow key={a.priority} action={a} />)}
            </tbody>
          </table>
        )}
      </Card>

      {/* Deterministic Narrative */}
      <Card>
        <SectionLabel>Authority Narrative</SectionLabel>
        <p className="text-sm text-gray-700 leading-relaxed" data-testid="onboarding-narrative">{narrative}</p>
      </Card>

      {/* Cross-links */}
      <Card>
        <SectionLabel>Related Authorities</SectionLabel>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link to="/connectors" className="text-blue-600 underline">Open Connectors</Link>
          <Link to="/certified-wedges" className="text-blue-600 underline">Open Certified Wedges</Link>
          <Link to="/trust" className="text-blue-600 underline">Open Trust Authority</Link>
          <Link to="/actions" className="text-blue-600 underline">Open Action Center</Link>
          <Link to="/outcome-protection" className="text-blue-600 underline">Open Outcome Protection</Link>
          <Link to="/technology-portfolio-authority" className="text-blue-600 underline">Open Technology Portfolio Authority</Link>
          <Link to="/executive-proof-pack-authority" className="text-blue-600 underline">Open Executive Proof Pack Authority</Link>
        </div>
      </Card>
    </div>
  );
}
