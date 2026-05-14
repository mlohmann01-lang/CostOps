import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getExecutionPlanEvents, getExecutionPlanItems, listExecutionEscalations, listExecutionPlans, getExecutionQueueStatus, pauseExecutionPlan, resumeExecutionPlan, cancelExecutionPlan, retryExecutionQueueItem, cancelExecutionQueueItem, acknowledgeExecutionEscalation, resolveExecutionEscalation } from "@/lib/execution-orchestration-client";

const actionAllowed = (status: string, action: "pause" | "resume" | "cancel") => ({ pause: ["READY", "RUNNING"], resume: ["PAUSED"], cancel: ["READY", "RUNNING", "PAUSED"] }[action].includes(status));
const itemActionAllowed = (status: string, action: "retry" | "cancel") => ({ retry: ["FAILED", "BLOCKED", "QUARANTINED"], cancel: ["READY", "WAITING_APPROVAL", "WAITING_DEPENDENCIES", "RETRY_SCHEDULED"] }[action].includes(status));

export default function ExecutionOrchestrationPage() {
  const qc = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const plans = useQuery({ queryKey: ["exec-plans"], queryFn: listExecutionPlans });
  const escalations = useQuery({ queryKey: ["exec-escalations"], queryFn: listExecutionEscalations });
  const queueStatus = useQuery({ queryKey: ["exec-queue-status"], queryFn: getExecutionQueueStatus });
  const planItems = useQuery({ queryKey: ["exec-plan-items", selectedPlanId], queryFn: () => getExecutionPlanItems(Number(selectedPlanId)), enabled: !!selectedPlanId });
  const events = useQuery({ queryKey: ["exec-plan-events", selectedPlanId], queryFn: () => getExecutionPlanEvents(Number(selectedPlanId)), enabled: !!selectedPlanId });

  const refresh = () => { qc.invalidateQueries({ queryKey: ["exec"] }); qc.invalidateQueries(); };
  const mutate = (fn: (id:number)=>Promise<any>) => useMutation({ mutationFn: fn, onSuccess: refresh });
  const pause = mutate(pauseExecutionPlan); const resume = mutate(resumeExecutionPlan); const cancel = mutate(cancelExecutionPlan);
  const retry = mutate(retryExecutionQueueItem); const cancelItem = mutate(cancelExecutionQueueItem);
  const ackEsc = mutate(acknowledgeExecutionEscalation); const resolveEsc = mutate(resolveExecutionEscalation);

  const metrics = useMemo(() => {
    const rows = plans.data ?? [];
    return {
      activePlans: rows.filter((p:any)=>["READY","RUNNING","PAUSED"].includes(p.status)).length,
      blocked: rows.filter((p:any)=>p.runtimeControlStatus==="BLOCK" || p.status==="BLOCKED").length,
      quarantined: rows.filter((p:any)=>p.runtimeControlStatus==="QUARANTINE" || p.status==="QUARANTINED").length,
      openEscalations: (escalations.data ?? []).filter((e:any)=>e.status==="OPEN").length,
      slaBreaches: (events.data ?? []).filter((e:any)=>e.eventType==="SLA_BREACH").length,
      highBlast: rows.filter((p:any)=>["HIGH","CRITICAL"].includes(p.blastRadiusBand)).length,
    };
  }, [plans.data, escalations.data, events.data]);

  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Execution Orchestration</h1><p className="text-sm text-muted-foreground">Execution orchestration coordinates approved execution. It does not override governance, approval, runtime controls, or rollback rules.</p>
    <div className="grid grid-cols-4 gap-3">{Object.entries({ ...metrics, readyQueueItems: queueStatus.data?.readyCount ?? 0 }).map(([k,v]) => <Card key={k}><CardHeader><CardTitle className="text-xs">{k}</CardTitle></CardHeader><CardContent className="text-xl">{String(v)}</CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Plans</CardTitle></CardHeader><CardContent><table className="w-full text-sm"><thead><tr>{["Plan","Status","Plan Type","Risk Max","Blast Radius","Approval Required","Runtime Status","Created","Updated","Actions"].map(h=><th key={h} className="text-left p-1">{h}</th>)}</tr></thead><tbody>{(plans.data??[]).map((p:any)=><tr key={p.id} className="border-t"><td className="p-1">{p.id}</td><td><Badge variant={p.status==="BLOCKED"?"destructive":"secondary"}>{p.status}</Badge></td><td>{p.planType}</td><td>{p.riskClassMax}</td><td>{p.blastRadiusBand}</td><td>{String(p.approvalRequired)}</td><td>{p.runtimeControlStatus}</td><td>{String(p.createdAt)}</td><td>{String(p.updatedAt)}</td><td className="space-x-1"><Button size="sm" onClick={()=>setSelectedPlanId(p.id)}>View</Button>{actionAllowed(p.status,"pause")&&<Button size="sm" variant="outline" onClick={()=>pause.mutate(p.id)}>Pause</Button>}{actionAllowed(p.status,"resume")&&<Button size="sm" variant="outline" onClick={()=>resume.mutate(p.id)}>Resume</Button>}{actionAllowed(p.status,"cancel")&&<Button size="sm" variant="destructive" onClick={()=>cancel.mutate(p.id)}>Cancel</Button>}</td></tr>)}</tbody></table></CardContent></Card>
    {selectedPlanId && <Card><CardHeader><CardTitle>Plan Detail #{selectedPlanId}</CardTitle></CardHeader><CardContent><h3 className="font-medium">Queue Items</h3><div className="space-y-2">{(planItems.data??[]).map((i:any)=><div key={i.id} className="border p-2 rounded"><div className="flex justify-between"><div>{i.actionType} · {i.targetEntity}</div><Badge variant={i.status==="QUARANTINED"?"destructive":"secondary"}>{i.status}</Badge></div><pre className="text-xs overflow-auto">{JSON.stringify(i,null,2)}</pre><div className="space-x-1">{itemActionAllowed(i.status,"retry")&&<Button size="sm" onClick={()=>retry.mutate(i.id)}>Retry</Button>}{itemActionAllowed(i.status,"cancel")&&<Button size="sm" variant="destructive" onClick={()=>cancelItem.mutate(i.id)}>Cancel item</Button>}</div></div>)}</div><h3 className="font-medium mt-3">Evidence Timeline</h3>{(events.data??[]).map((e:any)=><details key={e.id} className="border rounded p-2"><summary>{e.eventType} · {e.createdAt}</summary><pre className="text-xs">{JSON.stringify(e,null,2)}</pre></details>)}</CardContent></Card>}
    <Card><CardHeader><CardTitle>Escalations</CardTitle></CardHeader><CardContent>{(escalations.data??[]).map((e:any)=><div key={e.id} className="border p-2 rounded mb-2 flex justify-between"><div><div>{e.escalationType} · {e.severity} · {e.status}</div><div className="text-xs text-muted-foreground">{e.reason}</div></div><div className="space-x-1">{e.status==="OPEN"&&<Button size="sm" onClick={()=>ackEsc.mutate(e.id)}>Acknowledge</Button>}{e.status!=="RESOLVED"&&<Button size="sm" onClick={()=>resolveEsc.mutate(e.id)}>Resolve</Button>}<Button size="sm" variant="outline" onClick={()=>setSelectedPlanId(e.planId)}>Open related plan</Button></div></div>)}</CardContent></Card>
  </div></Layout>;
}
