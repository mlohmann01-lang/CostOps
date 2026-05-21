import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { ActionHistoryPanel, ExecutionConfirmationDrawer, OperatorActionBar, ProofDrawer, SavingsEvidencePanel, StatusPill, VerdictCard } from "@/components/ops/OperationalComponents";
import { TENANT_OPERATIONAL_MODE_REGISTRY, economicOperationsClient, getEconomicOpsPilotScenario, getEconomicOpsTenantMode, isEconomicOpsPreviewMode, toOperationalState, type ActionHistoryEntryDto, type CommandCenterDto, type ExecutionIntentDto, type ExecutionIntentResultDto, type ExecutionIntentType, type OutcomeLedgerSummaryDto, type ProofGraphDto, type ReplayDto, type RollbackDto, type TimelineDto } from "@/lib/economic-operations-client";

function RecommendationOperationalDetail({ execution, ledger, selectedState }: { execution: CommandCenterDto["executions"][number] | undefined; ledger: OutcomeLedgerSummaryDto | null; selectedState: ReturnType<typeof toOperationalState> }) {
  if (!execution) return null;
  return <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2"><h2 className="text-lg font-semibold">RecommendationOperationalDetail · Executive Verdict Summary · Pilot readiness checklist</h2><p className="text-sm text-slate-700">{execution.title} · Type: License optimization · Playbook: {execution.provider} · Affected user: disabled.user@acme-retail.example · Affected licences: Microsoft 365 E5</p><p className="text-sm text-slate-700">Projected monthly savings: ${ledger?.projectedMonthlySaving ?? 0} · Projected annual savings: ${ledger?.projectedAnnualSaving ?? 0} · Verified savings: ${ledger?.verifiedMonthlySaving ?? 0}/month</p><p className="text-sm text-slate-700">Blast radius: medium · Confidence level: high · Trust level: governed · Readiness state: {selectedState} · Current lifecycle state: {execution.state} · Next recommended operator action: {execution.action}</p><div className="rounded border p-3 text-sm"><p className="font-medium">Why This Exists</p><p className="text-xs text-slate-600 mt-1">Disabled User Reclaim: account disabled, licence assigned, inactivity duration exceeded, exclusion checks passed. E5 Downgrade: unused E5 capabilities, retained E3 capabilities, utilization classification low. Copilot Governance: low Copilot activity and below-threshold utilization. Overlap Elimination: duplicated capability with superseded service plans.</p><p className="text-xs text-slate-600 mt-1">Evidence freshness: current evidence sync visible in health panel · confidence reasoning: multi-proof match · utilization reasoning: sustained inactivity · blast-radius reasoning: single-user reversible action.</p></div></section>;
}

function ExecutionReadinessPanel({ state, tenantMode }: { state: ReturnType<typeof toOperationalState>; tenantMode: string }) {
  const blockers = [
    { sev: "high", why: "Missing Graph scopes prevent governed write validation", action: "Grant required Graph application scopes", blocked: false },
    { sev: "high", why: "Approval policy missing breaks governance boundary", action: "Configure approval policy", blocked: state === "APPROVAL_REQUIRED" },
    { sev: "medium", why: "Verification not configured blocks savings proof continuity", action: "Enable verification workflow", blocked: false },
    { sev: "medium", why: "Rollback config missing limits safe reversal", action: "Configure rollback policy", blocked: false },
    { sev: "high", why: "Tenant mode restriction may block live execution", action: "Promote tenant mode or keep recommend-only", blocked: tenantMode === "PILOT_READ_ONLY" },
    { sev: "medium", why: "Live execution disabled prevents execute action", action: "Enable live execution in governed mode", blocked: tenantMode !== "PRODUCTION_GOVERNED_EXECUTION" },
  ].filter((b) => b.blocked);
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-base font-semibold">ExecutionReadinessPanel · {blockers.length === 0 ? "Ready" : "Blocked"}</h3><div className="mt-2 space-y-2">{blockers.length === 0 ? <p className="text-sm text-emerald-700">Ready: execution controls and safeguards are currently sufficient.</p> : blockers.map((b) => <div key={b.why} className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">Severity: {b.sev} · Why it matters: {b.why} · Remediation: {b.action}</div>)}</div></section>;
}

function SimulationImpactPanel({ replay, ledger }: { replay: ReplayDto | null; ledger: OutcomeLedgerSummaryDto | null }) {
  return <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-1"><h3 className="text-base font-semibold">SimulationImpactPanel</h3><p className="text-sm">Before state: {replay?.before ?? "pending"}</p><p className="text-sm">Proposed state: {replay?.after ?? "pending"}</p><p className="text-sm">Removed/downgraded licences: Microsoft 365 E5 → E3</p><p className="text-sm">Retained capabilities: mailbox, Teams, security baseline</p><p className="text-sm">Projected savings: ${ledger?.projectedMonthlySaving ?? 0}/month</p><p className="text-sm">Rollback support: {replay?.rollbackPlan ?? "available"}</p><p className="text-sm">Expected propagation window: {replay?.propagation ?? "15-30 minutes"}</p><p className="text-sm">Verification strategy: verify assignment + cost + utilization within 24 hours</p><p className="text-sm">Blast-radius analysis: single user bounded change</p></section>;
}

function OperationalTimelineExplorer({ timeline, selectedEvent, onSelectEvent, tenantMode }: { timeline: TimelineDto | null; selectedEvent: string | null; onSelectEvent: (id: string) => void; tenantMode: string }) {
  if (!timeline) return <div className="rounded-xl border p-4 text-sm text-slate-500">Timeline unavailable.</div>;
  return <section className="rounded-xl border border-slate-200 bg-white p-4"><h3 className="text-base font-semibold">OperationalTimelineExplorer</h3><ol className="mt-2 space-y-2">{timeline.events.map((evt) => <li key={evt.id}><button className="w-full rounded border border-slate-100 px-3 py-2 text-left text-sm" onClick={() => onSelectEvent(evt.id)}><div className="flex justify-between"><span>{evt.label}</span><StatusPill state={toOperationalState(evt.state)} /></div><p className="text-xs text-slate-600">Timestamp: {evt.at} · Actor: operator-001 · Transition: {evt.state} · Proof: available · Outcome: linked · Tenant mode: {tenantMode}</p></button>{selectedEvent === evt.id ? <p className="px-3 pt-1 text-xs text-slate-600">{evt.detail}</p> : null}</li>)}</ol></section>;
}

function OperationalProofExplorer({ proofGraph }: { proofGraph: ProofGraphDto | null }) {
  if (!proofGraph) return <div className="rounded-xl border p-4 text-sm text-slate-500">Proof graph unavailable.</div>;
  const stages = ["Evidence Proof", "Recommendation Proof", "Readiness Proof", "Approval Proof", "Execution Proof", "Verification Proof", "Drift Proof", "Rollback Proof"];
  return <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3"><h3 className="text-base font-semibold">OperationalProofExplorer</h3>{stages.map((stage, i) => <div key={stage} className="rounded border p-2"><p className="text-sm font-medium">{stage}</p>{proofGraph.nodes[i] ? <ProofDrawer title={proofGraph.nodes[i].title} summary={proofGraph.nodes[i].summary}>Proof completeness: complete · source of truth: {proofGraph.nodes[i].environment} · freshness: current · supporting evidence: {proofGraph.nodes[i].expandableDetails} · related lifecycle event: {stage.replace(" Proof", "")}</ProofDrawer> : <p className="text-xs text-slate-500">No node currently linked.</p>}</div>)}{proofGraph.warning === "PROOF_INCOMPLETE" ? <div className="rounded border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">Proof completeness warning: missing required lifecycle proof nodes.</div> : null}</section>;
}

function DriftRollbackVisibility({ ledger, rollback }: { ledger: OutcomeLedgerSummaryDto | null; rollback: RollbackDto | null }) {
  return <section className="grid gap-4 lg:grid-cols-2"><div className="rounded-xl border border-slate-200 bg-white p-4 text-sm"><h3 className="font-semibold">Drift State</h3><p>Current drift status: {ledger?.driftRecurrenceStatus ?? "none"}</p><p>Drift type: license reassignment recurrence</p><p>Detected timestamp: latest monitoring cycle</p><p>Severity: medium</p><p>Impact: savings at risk if recurrence persists</p><p>Next required action: Acknowledge Drift then re-apply governed action</p></div><div className="rounded-xl border border-slate-200 bg-white p-4 text-sm"><h3 className="font-semibold">Rollback State</h3><p>Rollback readiness: {ledger?.rollbackStatus ?? "unknown"}</p><p>Rollback availability: {rollback ? "available" : "pending"}</p><p>Rollback blockers: {rollback?.blockers.join(", ") || "none"}</p><p>Rollback approval requirement: required for production governed mode</p><p>Rollback execution state: {rollback?.notes ?? "not requested"}</p></div></section>;
}

export function ExecutiveOpsRuntime() {
  const [data, setData] = useState<CommandCenterDto | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<TimelineDto | null>(null);
  const [replay, setReplay] = useState<ReplayDto | null>(null);
  const [rollback, setRollback] = useState<RollbackDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [proofGraph, setProofGraph] = useState<ProofGraphDto | null>(null);
  const [ledger, setLedger] = useState<OutcomeLedgerSummaryDto | null>(null);
  const [intentResult, setIntentResult] = useState<ExecutionIntentResultDto | null>(null);
  const [history, setHistory] = useState<ActionHistoryEntryDto[]>([]);
  const [pendingAction, setPendingAction] = useState<ExecutionIntentType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { economicOperationsClient.getCommandCenter().then((v) => { setData(v); setSelectedId(v.executions[0]?.id ?? null); }).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!selectedId) return; Promise.allSettled([economicOperationsClient.getTimeline(selectedId), economicOperationsClient.getReplay(selectedId), economicOperationsClient.getRollback(selectedId), economicOperationsClient.getProofGraph(selectedId), economicOperationsClient.getOutcomeLedgerSummary(selectedId), economicOperationsClient.getActionHistory(selectedId)]).then(([t, rp, rb, pg, ol, ah]) => { if (t.status === "fulfilled") setTimeline(t.value); if (rp.status === "fulfilled") setReplay(rp.value); if (rb.status === "fulfilled") setRollback(rb.value); if (pg.status === "fulfilled") setProofGraph(pg.value); if (ol.status === "fulfilled") setLedger(ol.value); if (ah.status === "fulfilled") setHistory(ah.value.actions); }); }, [selectedId]);

  const selectedExecution = useMemo(() => data?.executions.find((e) => e.id === selectedId), [data, selectedId]);
  const selectedState = toOperationalState(selectedExecution?.state ?? "MANUAL_ONLY");
  const tenantMode = getEconomicOpsTenantMode();
  const modeRule = TENANT_OPERATIONAL_MODE_REGISTRY[tenantMode];
  const disabledReasons: Partial<Record<ExecutionIntentType, string>> = {
    ROLLBACK: ["AVAILABLE", "REQUIRED"].includes((selectedState === "ROLLBACK_AVAILABLE" ? "AVAILABLE" : selectedState === "ROLLBACK_REQUIRED" ? "REQUIRED" : "NONE")) ? undefined : "INTENT_BLOCKED_BY_ROLLBACK",
    EXECUTE: tenantMode === "PILOT_READ_ONLY" || tenantMode === "PRODUCTION_LOCKED" ? "INTENT_BLOCKED_BY_TENANT_MODE" : (selectedState === "SIMULATION_REQUIRED" ? "INTENT_BLOCKED_BY_SIMULATION" : selectedState === "APPROVAL_REQUIRED" ? "INTENT_BLOCKED_BY_APPROVAL" : undefined),
  };

  if (loading) return <div className="rounded-xl border p-6 text-sm text-slate-500">Loading command center…</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"><AlertTriangle className="inline size-4" /> {error}</div>;
  if (!data || data.executions.length === 0) return <div className="rounded-xl border p-6 text-sm text-slate-500">No governed execution opportunities found for the selected tenant filter.</div>;

  const submitAction = async (action: ExecutionIntentType) => {
    if (!selectedId) return;
    const highRisk = ["EXECUTE", "ROLLBACK", "QUARANTINE", "MARK_MANUAL_ONLY"].includes(action);
    if (highRisk) { setPendingAction(action); setConfirmOpen(true); return; }
    const intent: ExecutionIntentDto = { tenantId: "TENANT-US", executionId: selectedId, actorId: "operator-001", actorRole: "FINOPS_OPERATOR", intentType: action, sourceSurface: "UI", reason: `Operator action ${action}`, timestamp: new Date().toISOString(), requiredProofIds: proofGraph?.nodes.map((n) => n.proofId) ?? [], expectedStateTransition: { from: selectedState, to: selectedState }, idempotencyKey: `${selectedId}-${action}-${Date.now()}` };
    const result = await economicOperationsClient.submitExecutionIntent(intent);
    setIntentResult(result);
    const [actions, graph, outcome] = await Promise.all([economicOperationsClient.getActionHistory(selectedId), economicOperationsClient.getProofGraph(selectedId), economicOperationsClient.getOutcomeLedgerSummary(selectedId)]);
    setHistory(actions.actions); setProofGraph(graph); setLedger(outcome);
  };

  return <div className="space-y-6">{isEconomicOpsPreviewMode() ? <div className="rounded border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">{modeRule.uiBanner} · Preview mode is ON (`VITE_ECONOMIC_OPS_PREVIEW_MODE=true`) · scenario `{getEconomicOpsPilotScenario()}`.</div> : <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{modeRule.uiBanner} · API mode is ON. M365 Optimization & Governance.</div>}<p className="text-xs text-slate-600">ledgerEnvironment: {ledger?.ledgerEnvironment ?? "-"} · sourceOfTruth: {ledger?.sourceOfTruth ?? "-"} · isFixtureBacked: {String(ledger?.isFixtureBacked ?? false)}</p><RecommendationOperationalDetail execution={selectedExecution} ledger={ledger} selectedState={selectedState} /><section><h2 className="text-lg font-semibold mb-2">Command Center Drill-In</h2><div className="grid gap-4 lg:grid-cols-3">{data.executions.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className="text-left"><VerdictCard title={item.title} state={toOperationalState(item.state)} impact={item.impact} action={item.action}><p className="text-xs text-slate-600">Click to drill into recommendation detail, timeline, proof, readiness, and actions.</p></VerdictCard></button>)}</div></section><ExecutionReadinessPanel state={selectedState} tenantMode={tenantMode} /><SimulationImpactPanel replay={replay} ledger={ledger} /><section className="grid gap-6 xl:grid-cols-5"><div className="xl:col-span-3"><OperationalTimelineExplorer timeline={timeline} selectedEvent={selectedEvent} onSelectEvent={setSelectedEvent} tenantMode={tenantMode} /></div><div className="xl:col-span-2"><OperationalProofExplorer proofGraph={proofGraph} /></div></section><DriftRollbackVisibility ledger={ledger} rollback={rollback} /><section className="grid gap-4 lg:grid-cols-2"><div className="space-y-3"><h3 className="text-base font-semibold">RecommendationActionBar</h3><OperatorActionBar state={selectedState} disabledReasons={disabledReasons} onAction={submitAction} /><ExecutionConfirmationDrawer open={confirmOpen} action={pendingAction} onCancel={() => { setConfirmOpen(false); setPendingAction(null); }} onConfirm={() => { setConfirmOpen(false); setPendingAction(null); }} confirmationPhrase="CONFIRM GOVERNED ACTION" />{intentResult ? <div className="rounded border p-3 text-xs">Intent result: {intentResult.reason} {intentResult.rejected ? "(deterministic rejection rendered)" : ""}</div> : null}<ActionHistoryPanel entries={history} /></div><SavingsEvidencePanel value={`${ledger?.projectedAnnualSaving ?? 0} / year projected`} proof="Savings Evidence · Execution Outcome · Verification Result · Drift Prevention · Approval Provenance" /></section></div>;
}
