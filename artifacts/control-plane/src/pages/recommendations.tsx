import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListRecommendations,
  useGenerateRecommendations,
  useApproveRecommendation,
  useRejectRecommendation,
  getListRecommendationsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetActionBreakdownQueryKey,
  getGetSavingsTrendQueryKey,
  getGetOutcomesSummaryQueryKey,
  getListOutcomesQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RefreshCw, CheckCircle2, XCircle, ChevronRight } from "lucide-react";
import { formatCurrency, getTrustScoreColor, getExecutionStatusColor, getStatusColor, formatDate } from "@/lib/format";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "executed";
type RecommendationWithPricing = {
  pricingConfidence?: string;
  pricingSource?: string;
};

function pricingLabel(confidence?: string) {
  switch (confidence) {
    case "VERIFIED_CONTRACT": return "Contract verified";
    case "VERIFIED_INVOICE": return "Invoice verified";
    case "VERIFIED_CSP": return "CSP verified";
    case "INFERRED": return "Inferred";
    case "PUBLIC_LIST": return "Microsoft list price";
    default: return "Unknown pricing";
  }
}

function pricingCopy(confidence?: string) {
  if (confidence === "UNKNOWN" || !confidence) return "Savings estimate unavailable until pricing source is connected.";
  if (confidence === "PUBLIC_LIST") return "Estimated from public Microsoft pricing; actual tenant cost may differ.";
  if (confidence.startsWith("VERIFIED_")) return "Savings backed by tenant pricing evidence.";
  return "Savings derived from inferred tenant pricing signals.";
}
const playbookLibrary = [
  { name: "Disabled Licensed User Reclaim", description: "Reclaim licenses from disabled accounts.", riskClass: "B", mode: "APPROVAL_REQUIRED", evidence: "user account status, assigned license, SKU cost", action: "REMOVE_LICENSE", verification: "Confirm unassigned license and no exception", rollback: "Reassign prior SKU when needed" },
  { name: "Inactive User Reclaim", description: "Remove licenses from inactive users.", riskClass: "B", mode: "APPROVAL_REQUIRED", evidence: "last sign-in, activity, assigned license", action: "REMOVE_LICENSE", verification: "Check no reactivation post-change", rollback: "Restore license on reactivation" },
  { name: "E3 Without Desktop Apps Rightsize", description: "Downgrade E3 users with no desktop usage.", riskClass: "B", mode: "APPROVAL_REQUIRED", evidence: "assigned license, desktop app install/use", action: "DOWNGRADE_LICENSE", verification: "Validate no desktop demand", rollback: "Re-upgrade to E3" },
  { name: "E5 Underused Rightsize", description: "Downgrade underused E5 users.", riskClass: "B", mode: "APPROVAL_REQUIRED", evidence: "assigned license, app/service activity", action: "DOWNGRADE_LICENSE", verification: "Validate E5 capabilities not needed", rollback: "Restore E5 when needed" },
  { name: "Add-on Licence Reclaim", description: "Reclaim unused add-ons.", riskClass: "B", mode: "APPROVAL_REQUIRED", evidence: "assigned license, add-on usage", action: "REMOVE_LICENSE", verification: "Check continued non-usage", rollback: "Reassign add-on" },
  { name: "Copilot Underuse Reallocation", description: "Reallocate underused Copilot seats.", riskClass: "B", mode: "APPROVAL_REQUIRED", evidence: "assigned license, Copilot activity", action: "REALLOCATE_LICENSE", verification: "Confirm reassignee adoption", rollback: "Return license to original owner" },
  { name: "Shared Mailbox Licence Reclaim", description: "Remove paid SKUs from shared mailboxes.", riskClass: "B", mode: "APPROVAL_REQUIRED", evidence: "mailbox type, assigned license", action: "CONVERT_TO_SHARED_MAILBOX + REMOVE_LICENSE", verification: "Confirm mailbox shared access", rollback: "Re-license mailbox" },
  { name: "Duplicate / Overlapping SKU Cleanup", description: "Clean duplicate entitlements.", riskClass: "C", mode: "MANUAL", evidence: "overlapping SKU detection, assigned license, SKU cost", action: "REMOVE_LICENSE", verification: "Validate capability coverage", rollback: "Restore removed SKU" },
];

export default function Recommendations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<Record<number, string>>({});
  const [generatedRows, setGeneratedRows] = useState<any[]>([]);
  const [suppressedRows, setSuppressedRows] = useState<any[]>([]);
  const [arbitrationRows, setArbitrationRows] = useState<any[]>([]);
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");

  const recommendations = useListRecommendations({ status: statusFilter });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListRecommendationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetActionBreakdownQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetSavingsTrendQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetOutcomesSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListOutcomesQueryKey() });
  };

  const generate = useGenerateRecommendations({
    mutation: {
      onSuccess: (data) => {
        invalidate();
        toast({ title: `${data.generated} recommendation(s) generated` });
      },
    },
  });

  const approve = useApproveRecommendation({
    mutation: {
      onSuccess: () => {
        invalidate();
        setApproveId(null);
        toast({ title: "Action approved and executed", description: "Outcome logged to Savings Ledger." });
      },
      onError: () => {
        toast({ title: "Approval failed", variant: "destructive" });
      },
    },
  });

  const reject = useRejectRecommendation({
    mutation: {
      onSuccess: () => {
        invalidate();
        setRejectId(null);
        setRejectReason("");
        toast({ title: "Recommendation rejected" });
      },
      onError: () => {
        toast({ title: "Rejection failed", variant: "destructive" });
      },
    },
  });

  const handleApprove = () => {
    if (approveId !== null) approve.mutate({ id: approveId });
  };

  const handleReject = () => {
    if (rejectId !== null && rejectReason.trim()) {
      reject.mutate({ id: rejectId, data: { reason: rejectReason } });
    }
  };

  const recRows = (recommendations.data ?? []) as any[];
  useEffect(() => {
    recRows.forEach((r:any)=>{ if(r.executionStatus==="APPROVAL_REQUIRED"){ fetch(`/api/approvals/recommendation/${r.id}`).then(x=>x.json()).then(a=>setApprovalStatus((m)=>({...m,[r.id]:a?.status ?? "MISSING"}))).catch(()=>{}); }});
    fetch("/api/playbooks/recommendations?tenantId=default").then(r=>r.json()).then(setGeneratedRows).catch(()=>{});
    fetch("/api/playbooks/suppressed?tenantId=default").then(r=>r.json()).then(setSuppressedRows).catch(()=>{});
    fetch("/api/recommendations/prioritized-queue?tenantId=default").then(r=>r.json()).then(setArbitrationRows).catch(()=>{});
  }, [recommendations.data]);
  const groupedRecommendations: Record<string, any[]> = recRows.reduce((acc, rec) => {
    const key = rec.playbookName || rec.playbook || "Unknown Playbook";
    acc[key] = acc[key] ?? [];
    acc[key].push(rec);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Recommendations</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Review, approve, or reject AI-generated cost optimisation actions
            </p>
          </div>
          <Button
            data-testid="button-generate"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${generate.isPending ? "animate-spin" : ""}`} />
            {generate.isPending ? "Scanning..." : "Run Playbooks"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-widest shrink-0">Status</Label>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-44" data-testid="select-status-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="executed">Executed</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          {recommendations.data && (
            <span className="text-xs text-muted-foreground">{recommendations.data.length} result(s)</span>
          )}
        </div>
        <Card>
          <CardHeader><CardTitle>M365 Playbook Library</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {playbookLibrary.map((p) => <div key={p.name} className="border rounded p-2"><div className="font-medium">{p.name}</div><div>{p.description}</div><div className="text-xs text-muted-foreground">Risk: {p.riskClass} · Mode: {p.mode} · Evidence: {p.evidence} · Action: {p.action} · Verification: {p.verification} · Rollback: {p.rollback}</div></div>)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>M365 Evidence Evaluation</CardTitle></CardHeader>
          <CardContent><Button size="sm" variant="outline" onClick={async()=>{ const payload={ tenantId:"default", source:"DEMO", evidenceRecords:[] }; await fetch("/api/playbooks/m365/evaluate",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(payload)}); const a=await fetch("/api/playbooks/recommendations?tenantId=default").then(r=>r.json()); const s=await fetch("/api/playbooks/suppressed?tenantId=default").then(r=>r.json()); setGeneratedRows(a); setSuppressedRows(s); }}>Evaluate M365 Evidence</Button></CardContent>
        </Card>
        <Card><CardHeader><CardTitle>Generated Recommendations</CardTitle></CardHeader><CardContent><div className="space-y-2 text-xs">{generatedRows.map((r:any)=><div key={`g-${r.id}`} className="border rounded p-2">{r.playbookName} · {r.targetEntityId || r.userEmail} · {r.actionType} · ${r.expectedMonthlySaving}/mo · ${r.expectedAnnualSaving}/yr · {r.recommendationRiskClass} · {r.recommendationExecutionMode} · {r.recommendationVerificationMethod}<div>Trust: {(r.trustRequirements??[]).join(", ")}</div>{r.recommendationStatus === "READY_FOR_ORCHESTRATION" && <Button size="sm" variant="outline" onClick={()=>fetch(`/api/playbooks/recommendations/${r.id}/create-orchestration-plan?tenantId=default`,{method:"POST"})}>Create Orchestration Plan</Button>}</div>)}</div></CardContent></Card>
        <Card><CardHeader><CardTitle>Suppressed Recommendations</CardTitle></CardHeader><CardContent><div className="space-y-2 text-xs">{suppressedRows.map((r:any)=><div key={`s-${r.id}`} className="border rounded p-2">{r.playbookId} · {r.targetEntityId} · {r.reasonCode} · {r.reasonText}</div>)}</div></CardContent></Card>

        <Card><CardHeader><CardTitle>Prioritized Recommendation Queue</CardTitle><p className="text-xs text-muted-foreground">Prioritization is deterministic and does not execute actions.</p></CardHeader><CardContent><div className="flex items-center gap-2 mb-3"><Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">ALL</SelectItem><SelectItem value="CRITICAL">CRITICAL</SelectItem><SelectItem value="HIGH">HIGH</SelectItem><SelectItem value="MEDIUM">MEDIUM</SelectItem><SelectItem value="LOW">LOW</SelectItem><SelectItem value="SUPPRESSED">SUPPRESSED</SelectItem></SelectContent></Select></div><div className="space-y-2 text-xs">{arbitrationRows.filter((r:any)=>priorityFilter==="ALL"?true:r.priorityBand===priorityFilter).map((r:any)=><div key={`a-${r.id}`} className="border rounded p-2">{r.priorityBand} · Score {Number(r.priorityScore).toFixed(2)} · Rec {r.recommendationId} · SavingsScore {Number(r.projectedSavingsScore).toFixed(1)} · Trust {Number(r.trustScore).toFixed(1)} · GovRisk {Number(r.governanceRiskScore).toFixed(1)} · Blast {Number(r.blastRadiusScore).toFixed(1)} · Confidence {Number(r.realizationConfidenceScore).toFixed(1)}<div>Suppression/Conflict: {[...(r.suppressionReasons??[]), r.conflictGroupId?`CONFLICT_GROUP:${r.conflictGroupId}`:null].filter(Boolean).join(", ") || "NONE"}</div></div>)}</div></CardContent></Card>

        <Card className="p-0">
          {recommendations.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !recommendations.data?.length ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recommendations in this category</p>
              <p className="text-xs text-muted-foreground mt-1">Run playbooks to detect new opportunities</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(groupedRecommendations).map(([playbookName, recs]) => (
                <div key={playbookName}>
                  <div className="px-6 py-2 bg-muted/30 text-xs font-semibold uppercase tracking-wide">{playbookName}</div>
                  {recs.map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
                  data-testid={`row-rec-${rec.id}`}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/recommendations/${rec.id}`}>
                          <span
                            className="text-sm font-medium hover:text-primary cursor-pointer transition-colors"
                            data-testid={`link-rec-${rec.id}`}
                          >
                            {rec.displayName}
                          </span>
                        </Link>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getExecutionStatusColor(rec.executionStatus)}`}
                        >
                          {rec.executionStatus.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline" className={`text-xs ${getStatusColor(rec.status)}`}>
                          {rec.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {rec.userEmail} · {rec.licenceSku} · Action: {(rec.playbookId.includes("rightsizing") || rec.playbookId.includes("web_only")) ? "DOWNGRADE_LICENSE" : rec.playbookId.includes("shared_mailbox") ? "CONVERT_TO_SHARED_MAILBOX + REMOVE_LICENSE" : "REMOVE_LICENSE"} · {rec.daysSinceActivity} days inactive ·{" "}
                        {formatDate(rec.createdAt)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(rec.monthlyCost)}/mo · {formatCurrency(rec.annualisedCost)}/yr · Source: {rec.pricingSource || "—"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {pricingLabel(rec.pricingConfidence)}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">{pricingCopy(rec.pricingConfidence)}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Trust: {rec.executionStatus} · Reconciliation warnings: {(rec.warnings ?? []).join(", ") || "None"}</p>
                      {rec.rejectionReason && (
                        <p className="text-xs text-red-400 mt-0.5">Rejected: {rec.rejectionReason}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <Badge
                      variant="outline"
                      className={`text-xs font-mono ${getTrustScoreColor(rec.trustScore)}`}
                      data-testid={`badge-trust-score-${rec.id}`}
                    >
                      Trust {(rec.trustScore * 100).toFixed(0)}%
                    </Badge>
                    <span className="text-sm font-semibold text-primary w-20 text-right">
                      {formatCurrency(rec.monthlyCost)}/mo
                    </span>

                    {rec.status === "pending" && (
                      <>
                        {rec.executionStatus === "APPROVAL_REQUIRED" && approvalStatus[rec.id] !== "APPROVED" ? (
                          <Button size="sm" variant="outline" onClick={async()=>{ await fetch("/api/approvals",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tenantId:"default",recommendationId:String(rec.id),requestedBy:"admin@contoso.com",reason:"Approval requested from recommendations",riskClass:"B"})}); setApprovalStatus((m)=>({...m,[rec.id]:"PENDING"})); }} data-testid={`button-request-approval-${rec.id}`}>Request Approval</Button>
                        ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-green-500 border-green-500/30 hover:bg-green-500/10"
                          onClick={() => setApproveId(rec.id)}
                          data-testid={`button-approve-${rec.id}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
                          onClick={() => {
                            setRejectId(rec.id);
                            setRejectReason("");
                          }}
                          data-testid={`button-reject-${rec.id}`}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </Button>
                      </>
                    )}

                    <Link href={`/recommendations/${rec.id}`}>
                      <ChevronRight className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-pointer" />
                    </Link>
                  </div>
                </div>
              ))}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Approve Dialog */}
      <AlertDialog open={approveId !== null} onOpenChange={(open) => !open && setApproveId(null)}>
        <AlertDialogContent data-testid="dialog-approve">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve and Execute Action</AlertDialogTitle>
            <AlertDialogDescription>
              This will simulate the licence reclaim action and log the outcome to the Savings Ledger. In Phase 2, this
              will trigger a real Graph API licence removal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-approve">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={approve.isPending}
              data-testid="button-confirm-approve"
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approve.isPending ? "Executing..." : "Approve and Execute"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectId !== null} onOpenChange={(open) => !open && setRejectId(null)}>
        <AlertDialogContent data-testid="dialog-reject">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Recommendation</AlertDialogTitle>
            <AlertDialogDescription>Provide a reason for rejecting this recommendation.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. User is on planned leave..."
              rows={3}
              data-testid="input-reject-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reject">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={reject.isPending || !rejectReason.trim()}
              data-testid="button-confirm-reject"
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {reject.isPending ? "Rejecting..." : "Reject"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
