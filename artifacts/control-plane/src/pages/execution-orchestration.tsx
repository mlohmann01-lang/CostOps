import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { acknowledgeExecutionEscalation, approveAutomationCandidateAutoSafe, approveAutomationCandidateScheduled, cancelExecutionBatch, cancelExecutionPlan, cancelExecutionQueueItem, evaluateExecutionBatchReadiness, getExecutionPlanEvents, getExecutionPlanItems, getExecutionQueueStatus, listAutomationCandidates, listExecutionBatches, listExecutionEscalations, listExecutionPlans, listExecutionVerifications, getSavingsProofSummary, getSavingsProofByPlaybook, getSavingsProofByActionType, getSavingsProofByStatus, getSavingsProofTimeline, markExecutionVerificationDisputed, markExecutionVerificationFailed, markExecutionVerificationNeedsRollbackReview, markExecutionVerificationVerified, pauseExecutionBatch, pauseExecutionPlan, resolveExecutionEscalation, resumeExecutionPlan, retryExecutionQueueItem, rejectAutomationCandidate, revokeAutomationCandidate } from "@/lib/execution-orchestration-client";

const actionAllowed = (status: string, action: "pause" | "resume" | "cancel") => ({ pause: ["READY", "RUNNING"], resume: ["PAUSED"], cancel: ["READY", "RUNNING", "PAUSED"] }[action].includes(status));
const itemActionAllowed = (status: string, action: "retry" | "cancel") => ({ retry: ["FAILED", "BLOCKED", "QUARANTINED"], cancel: ["READY", "WAITING_APPROVAL", "WAITING_DEPENDENCIES", "RETRY_SCHEDULED"] }[action].includes(status));
const isCompletedBatch = (status: string) => ["COMPLETED", "FAILED", "CANCELLED"].includes(status);
const canShowAutoSafe = (c: any) => c?.riskClass === "A" && c?.blastRadiusBand === "LOW" && c?.rollbackAvailable && !c?.lastCriticalEscalationAt;

export default function ExecutionOrchestrationPage() {
  const qc = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const plans = useQuery({ queryKey: ["exec-plans"], queryFn: listExecutionPlans });
  const escalations = useQuery({ queryKey: ["exec-escalations"], queryFn: listExecutionEscalations });
  const queueStatus = useQuery({ queryKey: ["exec-queue-status"], queryFn: getExecutionQueueStatus });
  const batches = useQuery({ queryKey: ["exec-batches"], queryFn: listExecutionBatches });
  const candidates = useQuery({ queryKey: ["exec-candidates"], queryFn: listAutomationCandidates });
  const planItems = useQuery({ queryKey: ["exec-plan-items", selectedPlanId], queryFn: () => getExecutionPlanItems(Number(selectedPlanId)), enabled: !!selectedPlanId });
  const verifications = useQuery({ queryKey: ["exec-verifications"], queryFn: listExecutionVerifications });
  const events = useQuery({ queryKey: ["exec-plan-events", selectedPlanId], queryFn: () => getExecutionPlanEvents(Number(selectedPlanId)), enabled: !!selectedPlanId });
  const savingsSummary = useQuery({ queryKey:["savings-proof-summary"], queryFn:getSavingsProofSummary });
  const byPlaybook = useQuery({ queryKey:["savings-proof-by-playbook"], queryFn:getSavingsProofByPlaybook });
  const byAction = useQuery({ queryKey:["savings-proof-by-action"], queryFn:getSavingsProofByActionType });
  const byStatus = useQuery({ queryKey:["savings-proof-by-status"], queryFn:getSavingsProofByStatus });
  const timeline = useQuery({ queryKey:["savings-proof-timeline"], queryFn:()=>getSavingsProofTimeline("30d") });
  const [candidateEvidence, setCandidateEvidence] = useState<any>(null);

  const refresh = () => qc.invalidateQueries();
  const mutate = (fn: (id:number)=>Promise<any>) => useMutation({ mutationFn: fn, onSuccess: refresh });
  const pause = mutate(pauseExecutionPlan); const resume = mutate(resumeExecutionPlan); const cancel = mutate(cancelExecutionPlan);
  const retry = mutate(retryExecutionQueueItem); const cancelItem = mutate(cancelExecutionQueueItem);
  const ackEsc = mutate(acknowledgeExecutionEscalation); const resolveEsc = mutate(resolveExecutionEscalation);
  const pauseBatchMut = mutate(pauseExecutionBatch); const cancelBatchMut = mutate(cancelExecutionBatch); const evalBatchMut = mutate(evaluateExecutionBatchReadiness);
  const approveScheduledMut = mutate(approveAutomationCandidateScheduled); const approveAutoSafeMut = mutate(approveAutomationCandidateAutoSafe);
  const rejectMut = useMutation({ mutationFn: (id:number)=>rejectAutomationCandidate(id), onSuccess: refresh });
  const verifyMut = useMutation({ mutationFn: (id:number)=>markExecutionVerificationVerified(id), onSuccess: refresh });
  const disputeMut = useMutation({ mutationFn: (id:number)=>markExecutionVerificationDisputed(id), onSuccess: refresh });
  const failVerMut = useMutation({ mutationFn: (id:number)=>markExecutionVerificationFailed(id), onSuccess: refresh });
  const rollbackReviewMut = useMutation({ mutationFn: (id:number)=>markExecutionVerificationNeedsRollbackReview(id), onSuccess: refresh });
  const revokeMut = useMutation({ mutationFn: (id:number)=>revokeAutomationCandidate(id), onSuccess: refresh });

  const metrics = useMemo(() => {
    const rows = plans.data ?? [];
    const batchRows = batches.data ?? [];
    const candidateRows = candidates.data ?? [];
    return {
      activePlans: rows.filter((p:any)=>["READY","RUNNING","PAUSED"].includes(p.status)).length,
      openEscalations: (escalations.data ?? []).filter((e:any)=>e.status==="OPEN").length,
      readyQueueItems: queueStatus.data?.readyCount ?? 0,
      blockedBatches: batchRows.filter((b:any)=>b.status==="BLOCKED").length,
      samplePending: batchRows.filter((b:any)=>b.readiness==="SAMPLE_REQUIRED").length,
      autoSafeEligible: candidateRows.filter((c:any)=>canShowAutoSafe(c)).length,
    };
  }, [plans.data, escalations.data, queueStatus.data, batches.data, candidates.data]);

  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Execution Orchestration</h1><p className="text-sm text-muted-foreground">Execution orchestration coordinates approved execution only; no force execute is exposed.</p>
    <div className="grid grid-cols-3 gap-3">{Object.entries(metrics).map(([k,v]) => <Card key={k}><CardHeader><CardTitle className="text-xs">{k}</CardTitle></CardHeader><CardContent className="text-xl">{String(v)}</CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Batch Execution panel</CardTitle></CardHeader><CardContent><table className="w-full text-sm"><thead><tr>{["Batch","Status","Readiness","Sample Batch","Failure Policy","Cooldown","Actions"].map(h=><th key={h} className="text-left p-1">{h}</th>)}</tr></thead><tbody>{(batches.data??[]).map((b:any)=><tr key={b.id} className="border-t"><td>{b.id}</td><td><Badge>{b.status}</Badge></td><td>{b.readiness}</td><td>{b.sampleBatchStatus ?? (b.isSampleBatch?"SAMPLE":"STANDARD")}</td><td>{b.failurePolicy}</td><td>{b.cooldownUntil ? String(b.cooldownUntil) : "None"}</td><td className="space-x-1"><Button size="sm" variant="outline" onClick={()=>evalBatchMut.mutate(b.id)}>Evaluate Readiness</Button><Button size="sm" variant="outline" disabled={isCompletedBatch(b.status)} onClick={()=>pauseBatchMut.mutate(b.id)}>Pause Batch</Button><Button size="sm" variant="destructive" disabled={isCompletedBatch(b.status)} onClick={()=>cancelBatchMut.mutate(b.id)}>Cancel Batch</Button></td></tr>)}</tbody></table></CardContent></Card>

    <Card><CardHeader><CardTitle>Outcome Verification panel (Expected vs Verified Savings)</CardTitle></CardHeader><CardContent><table className="w-full text-sm"><thead><tr>{["ID","Status","Action","Expected Monthly Saving","Expected Annual Saving","Verified Monthly Saving","Verified Annual Saving","Evidence","Actions"].map(h=><th key={h} className="text-left p-1">{h}</th>)}</tr></thead><tbody>{(verifications.data??[]).map((v:any)=><tr key={v.id} className="border-t"><td>{v.id}</td><td><Badge>{v.verificationStatus}</Badge></td><td>{v.actionType}</td><td>{Number(v.expectedMonthlySaving??0).toFixed(2)}</td><td>{Number(v.expectedAnnualSaving??0).toFixed(2)}</td><td>{v.actualMonthlySaving==null?"-":Number(v.actualMonthlySaving).toFixed(2)}</td><td>{v.actualAnnualSaving==null?"-":Number(v.actualAnnualSaving).toFixed(2)}</td><td><pre className="text-xs max-w-[260px] overflow-auto">{JSON.stringify(v.verificationEvidence ?? {}, null, 2)}</pre></td><td className="space-x-1"><Button size="sm" onClick={()=>verifyMut.mutate(v.id)}>Mark Verified</Button><Button size="sm" variant="outline" onClick={()=>disputeMut.mutate(v.id)}>Mark Disputed</Button><Button size="sm" variant="destructive" onClick={()=>failVerMut.mutate(v.id)}>Mark Failed</Button><Button size="sm" variant="secondary" onClick={()=>rollbackReviewMut.mutate(v.id)}>Flag Rollback Review</Button></td></tr>)}</tbody></table></CardContent></Card>

    <Card><CardHeader><CardTitle>Savings Proof Dashboard</CardTitle></CardHeader><CardContent><p className="text-xs text-muted-foreground mb-2">Verified savings only include outcomes that passed verification. Expected savings are not counted as realised savings.</p><div className="grid grid-cols-3 gap-2 text-sm"><div>Expected Savings: {Number(savingsSummary.data?.expectedMonthlySavings??0).toFixed(2)} / mo</div><div>Verified Savings: {Number(savingsSummary.data?.verifiedMonthlySavings??0).toFixed(2)} / mo</div><div>Disputed Savings: {Number(savingsSummary.data?.disputedMonthlySavings??0).toFixed(2)} / mo</div><div>Failed Verification Savings: {Number(savingsSummary.data?.failedMonthlySavings??0).toFixed(2)} / mo</div><div>Rollback Review Savings: {Number(savingsSummary.data?.rollbackReviewMonthlySavings??0).toFixed(2)} / mo</div><div>Verification Rate: {Number(savingsSummary.data?.verificationRatePercent??0).toFixed(2)}%</div><div>Savings Confidence: <Badge>{savingsSummary.data?.savingsConfidence ?? "LOW"}</Badge></div></div></CardContent></Card>

    <Card><CardHeader><CardTitle>Savings by Playbook</CardTitle></CardHeader><CardContent><pre className="text-xs">{JSON.stringify(byPlaybook.data ?? [], null, 2)}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Savings by Action Type</CardTitle></CardHeader><CardContent><pre className="text-xs">{JSON.stringify(byAction.data ?? [], null, 2)}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Savings by Verification Status</CardTitle></CardHeader><CardContent><pre className="text-xs">{JSON.stringify(byStatus.data ?? [], null, 2)}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Recent Savings Timeline</CardTitle></CardHeader><CardContent><pre className="text-xs">{JSON.stringify(timeline.data ?? [], null, 2)}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Automation Candidate Review panel</CardTitle></CardHeader><CardContent><div className="space-y-2">{(candidates.data??[]).map((c:any)=><div key={c.id} className="border p-2 rounded"><div className="flex justify-between"><div>#{c.id} {c.actionType} · Risk {c.riskClass} · Blast {c.blastRadiusBand}</div><Badge>{c.promotionStatus}</Badge></div><div className="text-xs">Demotion/Revoke history: {c.lastRuntimeBlockAt ? "runtime block; " : ""}{c.lastCriticalEscalationAt ? "critical escalation" : "none"}</div><div className="space-x-1 mt-1"><Button size="sm" onClick={()=>approveScheduledMut.mutate(c.id)}>Approve Scheduled</Button>{canShowAutoSafe(c) && <Button size="sm" onClick={()=>approveAutoSafeMut.mutate(c.id)}>Approve Auto-Safe</Button>}<Button size="sm" variant="outline" onClick={()=>rejectMut.mutate(c.id)}>Reject Candidate</Button><Button size="sm" variant="destructive" onClick={()=>revokeMut.mutate(c.id)}>Revoke Automation</Button><Button size="sm" variant="ghost" onClick={()=>setCandidateEvidence(c)}>Promotion Evidence</Button></div></div>)}</div></CardContent></Card>
    {candidateEvidence && <Card><CardHeader><CardTitle>Promotion Evidence drawer</CardTitle></CardHeader><CardContent><pre className="text-xs overflow-auto">{JSON.stringify(candidateEvidence.promotionEvidence ?? {}, null, 2)}</pre></CardContent></Card>}
  </div></Layout>;
}
