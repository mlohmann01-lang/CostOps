import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { ActionHistoryPanel, ExecutionConfirmationDrawer, OperatorActionBar, ProofDrawer, SavingsEvidencePanel, StatusPill, VerdictCard } from "@/components/ops/OperationalComponents";
import { TENANT_OPERATIONAL_MODE_REGISTRY, economicOperationsClient, getEconomicOpsPilotScenario, getEconomicOpsTenantMode, isEconomicOpsPreviewMode, toOperationalState, type ActionHistoryEntryDto, type CommandCenterDto, type ExecutionIntentDto, type ExecutionIntentResultDto, type ExecutionIntentType, type OutcomeLedgerSummaryDto, type ProofGraphDto, type ReplayDto, type RollbackDto, type TimelineDto } from "@/lib/economic-operations-client";

export function EconomicCommandCenter({ data, onSelect, selectedId }: { data: CommandCenterDto; onSelect: (id: string) => void; selectedId: string | null }) {
  const prioritized = [...data.executions].sort((a, b) => Number(b.approvalRequired) - Number(a.approvalRequired));
  return <section className="grid gap-4 lg:grid-cols-3">{prioritized.map((item) => <button key={item.id} onClick={() => onSelect(item.id)} className="text-left"><VerdictCard title={item.title} state={toOperationalState(item.state)} impact={item.impact} action={item.action}>{selectedId === item.id ? <p className="text-xs text-slate-600">Selected execution · tenant {item.tenantId} · provider {item.provider}</p> : null}</VerdictCard></button>)}</section>;
}

export function ExecutionTimelineExplorer({ timeline, selectedEvent, onSelectEvent }: { timeline: TimelineDto | null; selectedEvent: string | null; onSelectEvent: (id: string) => void }) {
  if (!timeline) return <div className="rounded-xl border p-4 text-sm text-slate-500">Select an execution to load timeline.</div>;
  return <div className="rounded-xl border border-slate-200 bg-white p-4"><ol className="space-y-2">{timeline.events.map((evt) => <li key={evt.id}><button className="flex w-full items-center gap-3 rounded-md border border-slate-100 px-3 py-2 text-left text-sm" onClick={() => onSelectEvent(evt.id)}><span className="flex-1">{evt.label}</span><StatusPill state={toOperationalState(evt.state)} /></button>{selectedEvent === evt.id ? <p className="px-3 pt-1 text-xs text-slate-600">{evt.detail}</p> : null}</li>)}</ol></div>;
}

export const ProofExplorer = ({ proofGraph }: { proofGraph: ProofGraphDto | null }) => {
  if (!proofGraph) return <div className="rounded-xl border p-4 text-sm text-slate-500">Proof graph unavailable.</div>;
  return <div className="space-y-3">{proofGraph.nodes.map((p) => <ProofDrawer key={p.proofId} title={p.title} summary={p.summary}>{p.expandableDetails} · Lineage in: {p.upstreamProofIds.join(", ") || "none"} · out: {p.downstreamProofIds.join(", ") || "none"}</ProofDrawer>)}{proofGraph.warning === "PROOF_INCOMPLETE" ? <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">PROOF_INCOMPLETE: missing required proof nodes.</div> : null}<div className="rounded border p-2 text-xs">Proof environment: {proofGraph.nodes[0]?.environment ?? "unknown"} · Fixture-backed: {String(proofGraph.nodes[0]?.isFixtureBacked ?? false)}</div></div>;
};
export const SimulationPreview = ({ replay }: { replay: ReplayDto | null }) => replay ? <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-sm"><p><span className="font-medium">Before:</span> {replay.before}</p><p><span className="font-medium">After:</span> {replay.after}</p><p><span className="font-medium">Propagation:</span> {replay.propagation}</p><p><span className="font-medium">Risk class:</span> {replay.risk}</p><p><span className="font-medium">Affected user/account:</span> disabled.user@acme-retail.example</p><p><span className="font-medium">Affected licence/SKU:</span> Microsoft 365 E5</p><p><span className="font-medium">Expected provider propagation delay:</span> 15-30 minutes</p><p><span className="font-medium">Verification window:</span> within 24 hours</p><p><span className="font-medium">Approval required:</span> yes</p><p><span className="font-medium">Blocked reasons:</span> none</p><p><span className="font-medium">Rollback plan:</span> {replay.rollbackPlan}</p></div> : <div className="rounded-xl border p-4 text-sm text-slate-500">Simulation preview pending.</div>;
export const RollbackExplorer = ({ rollback }: { rollback: RollbackDto | null }) => rollback ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm"><p className="font-medium">Rollback deadline: {rollback.deadline}</p><p>{rollback.notes}</p>{rollback.blockers.length > 0 ? <p className="mt-1">Blockers: {rollback.blockers.join(", ")}</p> : null}</div> : null;

export function ConnectorReadinessPanel({ data }: { data: CommandCenterDto }) { return <VerdictCard title="Connector readiness" state={data.connectors.some((c) => c.state !== "HEALTHY") ? "BLOCKED" : "GOVERNED_EXECUTION_ELIGIBLE"} impact={`${data.connectors.length} connectors visible`} action="Validate degraded connectors before autonomous execution" />; }
export function ApprovalQueuePanel({ data }: { data: CommandCenterDto }) { return <VerdictCard title="Approval queue" state="APPROVAL_REQUIRED" impact={`${data.approvals.length} actions awaiting signoff`} action="Review rationale and approve/reject" />; }
export function OperationsHealthPanel({ data }: { data: CommandCenterDto }) { return <div className="space-y-2">{data.health.map((h) => <div key={h.label} className="rounded border p-3"><div className="flex justify-between text-sm"><span>{h.label}</span><StatusPill state={toOperationalState(h.state)} /></div><p className="text-sm text-slate-600">{h.value}</p></div>)}</div>; }
export function TenantPosturePanel({ data }: { data: CommandCenterDto }) { return <div className="space-y-2">{data.tenantPosture.map((t) => <div key={t.tenantId} className="rounded border p-3 text-sm"><div className="flex justify-between"><span>{t.tenantId}</span><StatusPill state={toOperationalState(t.state)} /></div><p className="text-slate-600">{t.note}</p></div>)}</div>; }

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

  const proofItems = useMemo(() => proofGraph, [proofGraph]);

  if (loading) return <div className="rounded-xl border p-6 text-sm text-slate-500">Loading command center…</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"><AlertTriangle className="inline size-4" /> {error}</div>;

  if (!data || data.executions.length === 0) return <div className="rounded-xl border p-6 text-sm text-slate-500">No governed execution opportunities found for the selected tenant filter.</div>;

  const selectedState = toOperationalState(data.executions.find((e) => e.id === selectedId)?.state ?? "MANUAL_ONLY");
  const tenantMode = getEconomicOpsTenantMode();
  const modeRule = TENANT_OPERATIONAL_MODE_REGISTRY[tenantMode];
  const disabledReasons: Partial<Record<ExecutionIntentType, string>> = {
    ROLLBACK: ["AVAILABLE", "REQUIRED"].includes((selectedState === "ROLLBACK_AVAILABLE" ? "AVAILABLE" : selectedState === "ROLLBACK_REQUIRED" ? "REQUIRED" : "NONE")) ? undefined : "INTENT_BLOCKED_BY_ROLLBACK",
    EXECUTE: tenantMode === "PILOT_READ_ONLY" || tenantMode === "PRODUCTION_LOCKED" ? "INTENT_BLOCKED_BY_TENANT_MODE" : (selectedState === "SIMULATION_REQUIRED" ? "INTENT_BLOCKED_BY_SIMULATION" : selectedState === "APPROVAL_REQUIRED" ? "INTENT_BLOCKED_BY_APPROVAL" : undefined),
  };

  const submitAction = async (action: ExecutionIntentType) => {
    if (!selectedId) return;
    const highRisk = ["EXECUTE", "ROLLBACK", "QUARANTINE", "MARK_MANUAL_ONLY"].includes(action);
    if (highRisk) { setPendingAction(action); setConfirmOpen(true); return; }
    const intent: ExecutionIntentDto = { tenantId: "TENANT-US", executionId: selectedId, actorId: "operator-001", actorRole: "FINOPS_OPERATOR", intentType: action, sourceSurface: "UI", reason: `Operator action ${action}`, timestamp: new Date().toISOString(), requiredProofIds: proofGraph?.nodes.map((n) => n.proofId) ?? [], expectedStateTransition: { from: selectedState, to: selectedState }, idempotencyKey: `${selectedId}-${action}-${Date.now()}` };
    const result = await economicOperationsClient.submitExecutionIntent(intent);
    setIntentResult(result);
    const refreshed = await economicOperationsClient.getCommandCenter();
    setData(refreshed);
    const [actions, graph, outcome] = await Promise.all([economicOperationsClient.getActionHistory(selectedId), economicOperationsClient.getProofGraph(selectedId), economicOperationsClient.getOutcomeLedgerSummary(selectedId)]);
    setHistory(actions.actions);
    setProofGraph(graph);
    setLedger(outcome);
  };

  const confirmAction = async () => {
    if (!pendingAction || !selectedId) return;
    setConfirmOpen(false);
    const intent: ExecutionIntentDto = { tenantId: "TENANT-US", executionId: selectedId, actorId: "operator-001", actorRole: "FINOPS_OPERATOR", intentType: pendingAction, sourceSurface: "UI", reason: `Confirmed action ${pendingAction}`, timestamp: new Date().toISOString(), requiredProofIds: proofGraph?.nodes.map((n) => n.proofId) ?? [], expectedStateTransition: { from: selectedState, to: selectedState }, idempotencyKey: `${selectedId}-${pendingAction}-${Date.now()}` };
    const result = await economicOperationsClient.submitExecutionIntent(intent);
    setIntentResult(result);
    const [actions, graph, outcome] = await Promise.all([economicOperationsClient.getActionHistory(selectedId), economicOperationsClient.getProofGraph(selectedId), economicOperationsClient.getOutcomeLedgerSummary(selectedId)]);
    setHistory(actions.actions);
    setProofGraph(graph);
    setLedger(outcome);
    setPendingAction(null);
  };

  const checklist = [{ label: "Connector configured", ok: data.connectors.length > 0 && data.connectors.every((c) => c.state !== "OFFLINE") }, { label: "Evidence synced", ok: data.health.some((h) => /sync/i.test(h.label + h.value)) }, { label: "Trust sufficient", ok: !proofGraph?.warning }, { label: "Recommendations generated", ok: data.executions.length > 0 }, { label: "Simulation available", ok: Boolean(replay) }, { label: "Approval policy active", ok: data.executions.some((e) => e.approvalRequired) }, { label: "Execution mode configured", ok: data.tenantPosture.length > 0 }, { label: "Outcome ledger ready", ok: Boolean(ledger) }, { label: "Drift monitoring active", ok: (ledger?.driftRecurrenceStatus ?? "").length > 0 }];

  return <div className="space-y-6">{isEconomicOpsPreviewMode() ? <div className="rounded border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">{modeRule.uiBanner} · Preview mode is ON (`VITE_ECONOMIC_OPS_PREVIEW_MODE=true`) · scenario `{getEconomicOpsPilotScenario()}`.</div> : <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">{modeRule.uiBanner} · API mode is ON. Fixture fallback is disabled and backend errors are surfaced directly.</div>}<div className="grid gap-4 lg:grid-cols-3"><VerdictCard title="M365 Optimization & Governance" state={toOperationalState(data.executions[0]?.state ?? "MANUAL_ONLY")} impact={`$${ledger?.projectedMonthlySaving ?? 0}/month projected · $${ledger?.projectedAnnualSaving ?? 0}/year projected`} action={data.executions[0]?.action ?? "Open top recommendation"}><p className="text-xs text-slate-600">Eligible recommendations: {data.executions.length} · Requires approval: {data.executions.filter((e) => e.approvalRequired).length} · Blocked by trust/connector: {data.connectors.filter((c) => c.state !== "HEALTHY").length}</p><p className="text-xs text-slate-600">Connector health: {data.connectors.map((c) => `${c.name} ${c.state}`).join(", ")} · Latest evidence sync: {data.health[0]?.value ?? "unknown"}</p><p className="text-xs text-slate-600">Next operator action: {data.executions[0]?.action ?? "Review recommendation"}</p></VerdictCard><div className="rounded-lg border p-3 lg:col-span-2"><p className="text-sm font-medium">Pilot readiness checklist</p><div className="mt-2 grid gap-1 md:grid-cols-2">{checklist.map((item) => <p key={item.label} className="text-xs">{item.ok ? "✅" : "⚠️"} {item.label}</p>)}</div></div></div><EconomicCommandCenter data={data} onSelect={setSelectedId} selectedId={selectedId} /><section className="grid gap-6 xl:grid-cols-5"><div className="space-y-2 xl:col-span-3"><h2 className="text-lg font-semibold">Execution Timeline Explorer</h2><ExecutionTimelineExplorer timeline={timeline} selectedEvent={selectedEvent} onSelectEvent={setSelectedEvent} /></div><div className="space-y-2 xl:col-span-2"><h2 className="text-lg font-semibold">Operations Health Panel</h2><OperationsHealthPanel data={data} /></div></section><section className="grid gap-6 lg:grid-cols-2"><div><h2 className="text-lg font-semibold mb-2">Proof Explorer</h2><ProofExplorer proofGraph={proofItems} /></div><div className="space-y-3"><h2 className="text-lg font-semibold">Simulation Preview</h2><SimulationPreview replay={replay} /><RollbackExplorer rollback={rollback} /><SavingsEvidencePanel value={`${ledger?.projectedAnnualSaving ?? 118200} / year projected`} proof="Savings Evidence · Execution Outcome · Verification Result · Drift Prevention · Approval Provenance" /><div className="rounded border p-3 text-sm"><p><span className="font-medium">Projected monthly saving:</span> {ledger?.projectedMonthlySaving ?? "-"}</p><p><span className="font-medium">Verified monthly saving:</span> {ledger?.verifiedMonthlySaving ?? "pending"}</p><p><span className="font-medium">Verification status:</span> {ledger?.verificationStatus ?? "pending"}</p><p><span className="font-medium">Ledger environment:</span> {ledger?.ledgerEnvironment ?? "-"} · Fixture-backed: {String(ledger?.isFixtureBacked ?? false)} · Source of truth: {ledger?.sourceOfTruth ?? "-"}</p><p><span className="font-medium">Rollback status:</span> {ledger?.rollbackStatus ?? "unknown"}</p></div></div></section><section className="grid gap-4 lg:grid-cols-2"><div className="space-y-3"><OperatorActionBar state={selectedState} disabledReasons={disabledReasons} onAction={submitAction} /><ExecutionConfirmationDrawer open={confirmOpen} action={pendingAction} onCancel={() => { setConfirmOpen(false); setPendingAction(null); }} onConfirm={confirmAction} confirmationPhrase="CONFIRM GOVERNED ACTION" />{intentResult ? <div className="rounded border p-3 text-xs">Intent result: {intentResult.reason} {intentResult.rejected ? "(deterministic rejection rendered)" : ""}</div> : null}<ActionHistoryPanel entries={history} /></div></section><section className="grid gap-4 lg:grid-cols-3"><ConnectorReadinessPanel data={data} /><ApprovalQueuePanel data={data} /><VerdictCard title="Tenant posture" state={toOperationalState(data.tenantPosture[0]?.state ?? "MANUAL_ONLY")} impact="Tenant isolation enforced" action="Resolve connector drift before autonomous execution"><TenantPosturePanel data={data} /></VerdictCard></section></div>;
}
