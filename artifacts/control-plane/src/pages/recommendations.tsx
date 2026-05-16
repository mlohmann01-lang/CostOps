import { useState } from "react";
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
import { Card } from "@/components/ui/card";
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
import { RecommendationRow, safeArrayResponse, toRecommendationRow } from "@/lib/contracts/recommendation-contract";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "executed";

export default function Recommendations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [approveId, setApproveId] = useState<number | null>(null);
  const [rejectId, setRejectId] = useState<number | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  const recRows: RecommendationRow[] = safeArrayResponse<unknown>(recommendations.data, "recommendations.list").map(toRecommendationRow);
  const groupedRecommendations: Record<string, RecommendationRow[]> = recRows.reduce((acc, rec) => {
    const key = rec.playbookName || rec.playbook || "Unknown Playbook";
    acc[key] = acc[key] ?? [];
    acc[key].push(rec);
    return acc;
  }, {} as Record<string, RecommendationRow[]>);

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

        <Card className="p-0">
          {recommendations.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : !recRows.length ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No recommendations in this category</p>
              <p className="text-xs text-muted-foreground mt-1">Run playbooks to detect new opportunities</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {Object.entries(groupedRecommendations).map(([playbookName, recs]) => (
                <div key={playbookName}>
                  <div className="px-6 py-2 bg-muted/30 text-xs font-semibold uppercase tracking-wide">
                    {playbookName.replace(/_/g, " ")}
                  </div>
                  {recs.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between px-6 py-4 hover:bg-secondary/30 transition-colors"
                      data-testid={`row-rec-${rec.id}`}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
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
                            {rec.userEmail} · {rec.licenceSku} · {rec.daysSinceActivity} days inactive · {formatDate(rec.createdAt)}
                          </p>
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
                              onClick={() => { setRejectId(rec.id); setRejectReason(""); }}
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
