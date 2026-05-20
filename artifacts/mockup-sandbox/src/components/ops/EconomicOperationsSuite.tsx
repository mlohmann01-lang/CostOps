import { useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { ActionHistoryPanel, ExecutionConfirmationDrawer, OperatorActionBar, ProofDrawer, SavingsEvidencePanel, StatusPill, VerdictCard } from "@/components/ops/OperationalComponents";
import { economicOperationsClient, toOperationalState, type CommandCenterDto, type ExecutionIntentDto, type ExecutionIntentResultDto, type ExecutionIntentType, type OutcomeLedgerSummaryDto, type ProofGraphDto, type ReplayDto, type RollbackDto, type TimelineDto } from "@/lib/economic-operations-client";

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
  return <div className="space-y-3">{proofGraph.nodes.map((p) => <ProofDrawer key={p.proofId} title={p.title} summary={p.summary}>{p.expandableDetails} · Lineage in: {p.upstreamProofIds.join(", ") || "none"} · out: {p.downstreamProofIds.join(", ") || "none"}</ProofDrawer>)}{proofGraph.warning === "PROOF_INCOMPLETE" ? <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">PROOF_INCOMPLETE: missing required proof nodes.</div> : null}</div>;
};
export const SimulationPreview = ({ replay }: { replay: ReplayDto | null }) => replay ? <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2 text-sm"><p><span className="font-medium">Before:</span> {replay.before}</p><p><span className="font-medium">After:</span> {replay.after}</p><p><span className="font-medium">Propagation:</span> {replay.propagation}</p><p><span className="font-medium">Risk:</span> {replay.risk}</p><p><span className="font-medium">Rollback plan:</span> {replay.rollbackPlan}</p></div> : <div className="rounded-xl border p-4 text-sm text-slate-500">Simulation preview pending.</div>;
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
  const [history, setHistory] = useState<ExecutionIntentResultDto[]>([]);
  const [pendingAction, setPendingAction] = useState<ExecutionIntentType | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => { economicOperationsClient.getCommandCenter().then((v) => { setData(v); setSelectedId(v.executions[0]?.id ?? null); }).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false)); }, []);
  useEffect(() => { if (!selectedId) return; Promise.allSettled([economicOperationsClient.getTimeline(selectedId), economicOperationsClient.getReplay(selectedId), economicOperationsClient.getRollback(selectedId), economicOperationsClient.getProofGraph(selectedId), economicOperationsClient.getOutcomeLedgerSummary(selectedId)]).then(([t, rp, rb, pg, ol]) => { if (t.status === "fulfilled") setTimeline(t.value); if (rp.status === "fulfilled") setReplay(rp.value); if (rb.status === "fulfilled") setRollback(rb.value); if (pg.status === "fulfilled") setProofGraph(pg.value); if (ol.status === "fulfilled") setLedger(ol.value); }); }, [selectedId]);

  const proofItems = useMemo(() => proofGraph, [proofGraph]);

  if (loading) return <div className="rounded-xl border p-6 text-sm text-slate-500">Loading command center…</div>;
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700"><AlertTriangle className="inline size-4" /> {error}</div>;

  if (!data || data.executions.length === 0) return <div className="rounded-xl border p-6 text-sm text-slate-500">No governed execution opportunities found for the selected tenant filter.</div>;

  const selectedState = toOperationalState(data.executions.find((e) => e.id === selectedId)?.state ?? "MANUAL_ONLY");
  const disabledReasons: Partial<Record<ExecutionIntentType, string>> = {
    EXECUTE: selectedState === "SIMULATION_REQUIRED" ? "INTENT_BLOCKED_BY_SIMULATION" : selectedState === "APPROVAL_REQUIRED" ? "INTENT_BLOCKED_BY_APPROVAL" : undefined,
    ROLLBACK: ["AVAILABLE", "REQUIRED"].includes((selectedState === "ROLLBACK_AVAILABLE" ? "AVAILABLE" : selectedState === "ROLLBACK_REQUIRED" ? "REQUIRED" : "NONE")) ? undefined : "INTENT_BLOCKED_BY_ROLLBACK",
  };

  const submitAction = async (action: ExecutionIntentType) => {
    if (!selectedId) return;
    const highRisk = ["EXECUTE", "ROLLBACK", "QUARANTINE", "MARK_MANUAL_ONLY"].includes(action);
    if (highRisk) { setPendingAction(action); setConfirmOpen(true); return; }
    const intent: ExecutionIntentDto = { tenantId: "TENANT-US", executionId: selectedId, actorId: "operator-001", actorRole: "FINOPS_OPERATOR", intentType: action, sourceSurface: "UI", reason: `Operator action ${action}`, timestamp: new Date().toISOString(), requiredProofIds: proofGraph?.nodes.map((n) => n.proofId) ?? [], expectedStateTransition: { from: selectedState, to: selectedState }, idempotencyKey: `${selectedId}-${action}-${Date.now()}` };
    const result = await economicOperationsClient.submitExecutionIntent(intent);
    setIntentResult(result);
    setHistory((prev) => [result, ...prev]);
    const refreshed = await economicOperationsClient.getCommandCenter();
    setData(refreshed);
  };

  const confirmAction = async () => {
    if (!pendingAction || !selectedId) return;
    setConfirmOpen(false);
    const intent: ExecutionIntentDto = { tenantId: "TENANT-US", executionId: selectedId, actorId: "operator-001", actorRole: "FINOPS_OPERATOR", intentType: pendingAction, sourceSurface: "UI", reason: `Confirmed action ${pendingAction}`, timestamp: new Date().toISOString(), requiredProofIds: proofGraph?.nodes.map((n) => n.proofId) ?? [], expectedStateTransition: { from: selectedState, to: selectedState }, idempotencyKey: `${selectedId}-${pendingAction}-${Date.now()}` };
    const result = await economicOperationsClient.submitExecutionIntent(intent);
    setIntentResult(result);
    setHistory((prev) => [result, ...prev]);
    setPendingAction(null);
  };

  return <div className="space-y-6"><div className="rounded border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600">Fixture mode may be active in preview/demo environments.</div><EconomicCommandCenter data={data} onSelect={setSelectedId} selectedId={selectedId} /><section className="grid gap-6 xl:grid-cols-5"><div className="space-y-2 xl:col-span-3"><h2 className="text-lg font-semibold">Execution Timeline Explorer</h2><ExecutionTimelineExplorer timeline={timeline} selectedEvent={selectedEvent} onSelectEvent={setSelectedEvent} /></div><div className="space-y-2 xl:col-span-2"><h2 className="text-lg font-semibold">Operations Health Panel</h2><OperationsHealthPanel data={data} /></div></section><section className="grid gap-6 lg:grid-cols-2"><div><h2 className="text-lg font-semibold mb-2">Proof Explorer</h2><ProofExplorer proofGraph={proofItems} /></div><div className="space-y-3"><h2 className="text-lg font-semibold">Simulation Preview</h2><SimulationPreview replay={replay} /><RollbackExplorer rollback={rollback} /><SavingsEvidencePanel value={`${ledger?.projectedAnnualSaving ?? 118200} / year projected`} proof="Savings Evidence · Execution Outcome · Verification Result · Drift Prevention · Approval Provenance" /><div className="rounded border p-3 text-sm"><p><span className="font-medium">Projected monthly saving:</span> {ledger?.projectedMonthlySaving ?? "-"}</p><p><span className="font-medium">Verified monthly saving:</span> {ledger?.verifiedMonthlySaving ?? "pending"}</p><p><span className="font-medium">Verification status:</span> {ledger?.verificationStatus ?? "pending"}</p><p><span className="font-medium">Rollback status:</span> {ledger?.rollbackStatus ?? "unknown"}</p></div></div></section><section className="grid gap-4 lg:grid-cols-2"><div className="space-y-3"><OperatorActionBar state={selectedState} disabledReasons={disabledReasons} onAction={submitAction} /><ExecutionConfirmationDrawer open={confirmOpen} action={pendingAction} onCancel={() => { setConfirmOpen(false); setPendingAction(null); }} onConfirm={confirmAction} confirmationPhrase="CONFIRM GOVERNED ACTION" />{intentResult ? <div className="rounded border p-3 text-xs">Intent result: {intentResult.reason}</div> : null}<ActionHistoryPanel entries={history.map((h) => ({ action: h.idempotencyKey.split("-")[1] ?? "UNKNOWN", actor: "operator-001", sourceSurface: "UI", reason: h.reason, result: h.reason, previousState: h.previousState, nextState: h.nextState, timestamp: h.timestamp, proofIds: h.proofIds, ledgerEntryId: h.ledgerEntryId, idempotencyKey: h.idempotencyKey }))} /></div></section><section className="grid gap-4 lg:grid-cols-3"><ConnectorReadinessPanel data={data} /><ApprovalQueuePanel data={data} /><VerdictCard title="Tenant posture" state={toOperationalState(data.tenantPosture[0]?.state ?? "MANUAL_ONLY")} impact="Tenant isolation enforced" action="Resolve connector drift before autonomous execution"><TenantPosturePanel data={data} /></VerdictCard></section></div>;
}
