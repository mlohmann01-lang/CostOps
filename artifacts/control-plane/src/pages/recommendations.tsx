import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

type Rec = any;
export const canApproveRecommendation = (r: Rec): boolean => r?.executionReadiness === "APPROVAL_REQUIRED";
export const canBlockRecommendation = (reason: string): boolean => reason.trim().length > 0;
export const filterRecommendations = (rows: Rec[], filters: { risk: string }) =>
  rows.filter((x) => filters.risk === "all" || x.actionRiskClass === filters.risk);

const wording: Record<string, string> = {
  EXECUTION_READY: "Execution Ready",
  APPROVAL_REQUIRED: "Approval Required",
  BLOCKED: "Blocked",
  MANUAL_ONLY: "Manual Only",
  NEVER_ELIGIBLE: "Never Eligible",
};

export default function Recommendations() {
  const [rows, setRows] = useState<Rec[]>([]);
  const [selected, setSelected] = useState<Rec | null>(null);
  const [state, setState] = useState("all");
  const [readiness, setReadiness] = useState("all");
  const [playbook, setPlaybook] = useState("all");
  const [risk, setRisk] = useState("all");
  const [blockReason, setBlockReason] = useState("");
  const [requestStatus, setRequestStatus] = useState<string>("");
  const [dryRunState, setDryRunState] = useState<string>("");

  const load = async () => {
    const params = new URLSearchParams();
    if (state !== "all") params.set("state", state);
    if (readiness !== "all") params.set("readiness", readiness);
    if (playbook !== "all") params.set("playbookId", playbook);
    const r = await fetch(`/api/recommendations?${params.toString()}`);
    const data = await r.json();
    setRows(filterRecommendations(Array.isArray(data) ? data : [], { risk }));
  };

  useEffect(() => { load(); }, [state, readiness, playbook, risk]);

  const playbooks = useMemo(() => Array.from(new Set(rows.map((r) => r.playbookId))), [rows]);

  const act = async (id: string, action: "approve" | "recalculate" | "block") => {
    if (action === "block" && !canBlockRecommendation(blockReason)) return;
    await fetch(`/api/recommendations/${id}/${action}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action === "block" ? { reason: blockReason, blockedBy: "operator" } : { approvedBy: "operator" }) });
    setBlockReason("");
    await load();
    if (selected) {
      const fresh = await fetch(`/api/recommendations/${selected.recommendationId}`).then((x) => x.json());
      setSelected(fresh);
    }
  };
  const createExecutionRequest = async (id: string) => {
    const res = await fetch(`/api/recommendations/${id}/execution-requests`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestedBy: "operator", idempotencyKey: `ui-${id}` }) });
    const body = await res.json();
    setRequestStatus(body?.executionRequest?.executionState ?? "UNKNOWN");
  };
  const runDryRun = async () => {
    if (!selected?.executionRequestId) return;
    const res = await fetch(`/api/execution-requests/${selected.executionRequestId}/dry-run`, { method: "POST" });
    const body = await res.json();
    setDryRunState(body?.dryRun?.simulationState ?? "UNKNOWN");
  };

  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Recommendations Control Plane</h1>
    <div className="flex gap-2 flex-wrap">
      <Select value={state} onValueChange={setState}><SelectTrigger className="w-44"><SelectValue placeholder="State" /></SelectTrigger><SelectContent><SelectItem value="all">All states</SelectItem><SelectItem value="EXECUTION_READY">Execution Ready</SelectItem><SelectItem value="APPROVAL_REQUIRED">Approval Required</SelectItem><SelectItem value="BLOCKED">Blocked</SelectItem></SelectContent></Select>
      <Select value={readiness} onValueChange={setReadiness}><SelectTrigger className="w-44"><SelectValue placeholder="Readiness" /></SelectTrigger><SelectContent><SelectItem value="all">All readiness</SelectItem><SelectItem value="AUTO_EXECUTE_ELIGIBLE">Auto Execute Eligible</SelectItem><SelectItem value="APPROVAL_REQUIRED">Approval Required</SelectItem><SelectItem value="BLOCKED">Blocked</SelectItem><SelectItem value="MANUAL_ONLY">Manual Only</SelectItem><SelectItem value="NEVER_ELIGIBLE">Never Eligible</SelectItem></SelectContent></Select>
      <Select value={playbook} onValueChange={setPlaybook}><SelectTrigger className="w-56"><SelectValue placeholder="Playbook" /></SelectTrigger><SelectContent><SelectItem value="all">All playbooks</SelectItem>{playbooks.map((p)=><SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
      <Select value={risk} onValueChange={setRisk}><SelectTrigger className="w-36"><SelectValue placeholder="Risk" /></SelectTrigger><SelectContent><SelectItem value="all">All risk</SelectItem><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem><SelectItem value="D">D</SelectItem></SelectContent></Select>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4"><div className="space-y-3">{rows.map((r)=><div key={r.recommendationId} className="border rounded p-3 cursor-pointer" onClick={()=>setSelected(r)}><div className="flex justify-between"><div>{r.targetEntityId}</div><Badge>{wording[r.recommendationState] ?? r.recommendationState}</Badge></div><div className="text-xs text-muted-foreground">{r.playbookId} · Risk {r.actionRiskClass} · Evidence-backed {Array.isArray(r.evidencePointers)?r.evidencePointers.length:0}</div><div className="text-sm">${Number(r.projectedMonthlySavings).toFixed(2)}/mo · ${Number(r.projectedAnnualSavings).toFixed(2)}/yr</div><div className="text-xs">{Array.isArray(r.blockedReasons)&&r.blockedReasons.length?"Blocked by policy: "+r.blockedReasons.join(", "):"Savings visible, execution restricted"}</div></div>)}</div></Card>
      <Card className="p-4">{selected ? <div className="space-y-2 text-sm"><h2 className="font-semibold">Recommendation Detail</h2><div>State: {selected.recommendationState}</div><div>Execution readiness: {wording[selected.executionReadiness] ?? selected.executionReadiness}</div><div>Discovery lifecycle: {selected.discoveryLifecycleState}</div><div>Confidence: {selected.confidenceScore}</div><div>Reliability: {selected.reliabilityBand}</div><div>Projected savings: ${Number(selected.projectedMonthlySavings).toFixed(2)}/mo · ${Number(selected.projectedAnnualSavings).toFixed(2)}/yr</div><div>Target: {selected.targetEntityType} {selected.targetEntityId}</div><div>Graph refs: nodes {selected.graphNodeIds?.length ?? 0}, edges {selected.graphEdgeIds?.length ?? 0}</div><div>Readiness reasons: {(selected.readinessReasons ?? []).join(", ") || "-"}</div><div>Blocked reasons: {(selected.blockedReasons ?? []).join(", ") || "-"}</div><div>Required approvals: {(selected.requiredApprovals ?? []).join(", ") || "-"}</div><div>Evidence pointers: {(selected.evidencePointers ?? []).join(", ") || "-"}</div><div>Source refs: {(selected.sourceReferences ?? []).join(", ") || "-"}</div><div>Execution request status: {requestStatus || "none"}</div><div>Dry run status: {dryRunState || "none"}</div><div className="pt-2 flex gap-2"><Button onClick={()=>act(selected.recommendationId,"approve")} disabled={!canApproveRecommendation(selected)}>Approve</Button><Input placeholder="Block reason" value={blockReason} onChange={(e)=>setBlockReason(e.target.value)} className="max-w-xs"/><Button variant="destructive" onClick={()=>act(selected.recommendationId,"block")} disabled={!canBlockRecommendation(blockReason)}>Block</Button><Button variant="outline" onClick={()=>act(selected.recommendationId,"recalculate")}>Recalculate</Button><Button variant="secondary" onClick={()=>createExecutionRequest(selected.recommendationId)} disabled={selected.recommendationState!=="EXECUTION_READY"}>Create Execution Request</Button><Button variant="secondary" onClick={runDryRun} disabled={!(requestStatus==="REQUESTED" || requestStatus==="APPROVED_FOR_EXECUTION")}>Run Dry Run</Button></div></div> : <div>Select a recommendation</div>}</Card>
    </div></div></Layout>;
}
