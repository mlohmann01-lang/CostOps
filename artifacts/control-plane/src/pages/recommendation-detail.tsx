import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetRecommendation,
  useApproveRecommendation,
  useRejectRecommendation,
  getGetRecommendationQueryKey,
  getListRecommendationsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetActionBreakdownQueryKey,
  getListOutcomesQueryKey,
  getGetOutcomesSummaryQueryKey,
  getLatestRecommendationOutcome,
  getRecommendationOutcomes,
  getRecommendationOutcomeIntegrity,
  resolveRecommendationOutcome,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { ArrowLeft, CheckCircle2, XCircle, User, Calendar, ShieldCheck, Zap } from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  getTrustScoreColor,
  getExecutionStatusColor,
  getStatusColor,
} from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

function TrustScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.9 ? "bg-green-500" : value >= 0.75 ? "bg-amber-500" : value >= 0.5 ? "bg-orange-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{pct}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function RecommendationDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [latestOutcome, setLatestOutcome] = useState<any>(null);
  const [outcomeHistory, setOutcomeHistory] = useState<any[]>([]);
  const [integrity, setIntegrity] = useState<any>(null);

  const numId = parseInt(id ?? "", 10);
  const rec = useGetRecommendation(numId, {
    query: { enabled: !isNaN(numId), queryKey: getGetRecommendationQueryKey(numId) },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetRecommendationQueryKey(numId) });
    queryClient.invalidateQueries({ queryKey: getListRecommendationsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetActionBreakdownQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListOutcomesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetOutcomesSummaryQueryKey() });
  };

  const approve = useApproveRecommendation({
    mutation: {
      onSuccess: () => {
        invalidate();
        setApproveOpen(false);
        toast({ title: "Action approved and executed", description: "Outcome logged to Savings Ledger." });
      },
    },
  });



  useEffect(() => {
    if (isNaN(numId)) return;
    const loadOutcome = async () => {
      try { setLatestOutcome(await getLatestRecommendationOutcome(numId)); } catch { setLatestOutcome(null); }
      try { setOutcomeHistory(await getRecommendationOutcomes(numId)); } catch { setOutcomeHistory([]); }
      try { setIntegrity(await getRecommendationOutcomeIntegrity(numId)); } catch { setIntegrity(null); }
    };
    void loadOutcome();
  }, [numId]);

  const reject = useRejectRecommendation({
    mutation: {
      onSuccess: () => {
        invalidate();
        setRejectOpen(false);
        setRejectReason("");
        toast({ title: "Recommendation rejected" });
      },
    },
  });

  if (rec.isLoading) {
    return (
      <Layout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  if (!rec.data) {
    return (
      <Layout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Recommendation not found</p>
          <Button variant="ghost" className="mt-4" onClick={() => setLocation("/recommendations")}>
            Back to Recommendations
          </Button>
        </div>
      </Layout>
    );
  }

  const r = rec.data;
  const identityConf = r.trustScore >= 0.8 ? 0.9 : 0.6;
  const freshness = Math.min((r.daysSinceActivity ?? 90) / 180, 1);
  const signalConf = (r.daysSinceActivity ?? 90) > 90 ? 0.85 : 0.65;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/recommendations")}
            className="gap-2 text-muted-foreground"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
            Recommendations
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{r.displayName}</h1>
            <p className="text-sm text-muted-foreground mt-1">{r.userEmail}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`${getExecutionStatusColor(r.executionStatus)}`}>
              {r.executionStatus.replace(/_/g, " ")}
            </Badge>
            <Badge variant="outline" className={`${getStatusColor(r.status)}`}>
              {r.status}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Main Info */}
          <div className="xl:col-span-2 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <User className="w-3.5 h-3.5" />
                  User Context
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Email</p>
                  <p className="font-mono text-xs">{r.userEmail}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Licence SKU</p>
                  <p className="font-semibold">{r.licenceSku}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Last Activity</p>
                  <p>{r.lastActivity ? formatDate(r.lastActivity) : "Never"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Days Inactive</p>
                  <p className="text-amber-500 font-semibold">{r.daysSinceActivity} days</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Playbook</p>
                  <p className="font-mono text-xs">{r.playbook}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Connector</p>
                  <p className="uppercase text-xs font-semibold">{r.connector}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Detected</p>
                  <p>{formatDateTime(r.createdAt)}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  Cost Impact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center p-4 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Monthly Saving</p>
                    <p className="text-3xl font-bold text-primary" data-testid="text-monthly-cost">
                      {formatCurrency(r.monthlyCost)}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-secondary/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Annualised Saving</p>
                    <p className="text-3xl font-bold text-primary" data-testid="text-annual-cost">
                      {formatCurrency(r.annualisedCost)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            

            <Card>
              <CardHeader><CardTitle>Outcome Proof</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {!latestOutcome ? <p>No outcome has been resolved for this recommendation yet.</p> : <>
                  <div>Status: <Badge>{latestOutcome.outcomeStatus}</Badge></div>
                  <div>Resolution confidence: {latestOutcome.resolutionConfidence}</div>
                  <div>Projected savings: {formatCurrency(Number(latestOutcome.projectedMonthlySavings ?? 0))}/mo</div>
                  <div>Realized savings: {formatCurrency(Number(latestOutcome.realizedMonthlySavings ?? 0))}/mo</div>
                  <div>Delta: {Number(latestOutcome.realizationDelta ?? 0).toFixed(2)} ({Number(latestOutcome.realizationDeltaPercent ?? 0).toFixed(2)}%)</div>
                  <div>Drift detected: {String(!!latestOutcome.driftDetected)}</div>
                  <div>Reversal detected: {String(!!latestOutcome.reversalDetected)}</div>
                  <div>Resolved at: {formatDateTime(latestOutcome.resolvedAt)}</div>
                  <div>Deterministic hash: {integrity?.deterministicHash ?? latestOutcome.deterministicHash}</div>
                  <div>Integrity status: {integrity ? String(!!integrity.integrityValid) : "No outcome integrity record available."}</div>
                </>}
                <Button variant="outline" size="sm" onClick={async()=>{await resolveRecommendationOutcome(numId,{tenantId:"default"}); setLatestOutcome(await getLatestRecommendationOutcome(numId)); setOutcomeHistory(await getRecommendationOutcomes(numId)); setIntegrity(await getRecommendationOutcomeIntegrity(numId));}}>Resolve Outcome</Button>
                <p className="text-xs text-muted-foreground">Resolving an outcome records a deterministic outcome snapshot. It does not execute or remediate anything.</p>
              </CardContent>
            </Card>

            <Card><CardHeader><CardTitle>Projected vs Realized Savings</CardTitle></CardHeader><CardContent className="text-sm space-y-1">
              {!latestOutcome ? <p>No outcome has been resolved for this recommendation yet.</p> : <>
                <div>Projected monthly: {Number(latestOutcome.projectedMonthlySavings ?? 0).toFixed(2)}</div>
                <div>Realized monthly: {Number(latestOutcome.realizedMonthlySavings ?? 0).toFixed(2)}</div>
                <div>Projected annualized: {Number(latestOutcome.projectedAnnualizedSavings ?? 0).toFixed(2)}</div>
                <div>Realized annualized: {Number(latestOutcome.realizedAnnualizedSavings ?? 0).toFixed(2)}</div>
                <div>Monthly delta: {Number(latestOutcome.realizationDelta ?? 0).toFixed(2)}</div>
                <div>Annualized delta: {Number((latestOutcome.realizedAnnualizedSavings ?? 0) - (latestOutcome.projectedAnnualizedSavings ?? 0)).toFixed(2)}</div>
                <div>Delta %: {Number(latestOutcome.realizationDeltaPercent ?? 0).toFixed(2)}%</div>
              </>}
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Confidence Calibration</CardTitle></CardHeader><CardContent className="text-sm">
              <p className="text-xs text-muted-foreground">Calibration measures whether projected confidence matched verified outcome evidence.</p>
              {!latestOutcome ? <p>No outcome has been resolved for this recommendation yet.</p> : <>
                <div>Projected confidence: {(r as any).pricingConfidence ?? "UNKNOWN"}</div>
                <div>Resolution confidence: {latestOutcome.resolutionConfidence}</div>
                <div>Calibration result: {latestOutcome.confidenceCalibration}</div>
              </>}
            </CardContent></Card>

            <Card><CardHeader><CardTitle>Outcome History</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
              <p className="text-xs text-muted-foreground">Outcome history is append-only. Prior outcomes are preserved for audit and replay.</p>
              {!outcomeHistory.length ? <p>No outcome history available.</p> : outcomeHistory.map((o:any)=><div key={o.id} className="border rounded p-2 text-xs"><div>{o.outcomeStatus} · {formatDateTime(o.resolvedAt)} · {o.resolutionConfidence}</div><div>Delta: {Number(o.realizationDelta ?? 0).toFixed(2)} ({Number(o.realizationDeltaPercent ?? 0).toFixed(2)}%)</div><div>{o.driftReason ?? o.reversalReason ?? "No drift/reversal reason"}</div><div>Hash: {o.deterministicHash}</div></div>)}
            </CardContent></Card>

            {r.rejectionReason && (
              <Card className="border-red-500/20 bg-red-500/5">
                <CardContent className="pt-4">
                  <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Rejection Reason</p>
                  <p className="text-sm">{r.rejectionReason}</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Trust Score Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Trust Score
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <p
                    className={`text-5xl font-bold font-mono ${getTrustScoreColor(r.trustScore).split(" ")[0]}`}
                    data-testid="text-trust-score"
                  >
                    {(r.trustScore * 100).toFixed(0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">out of 100</p>
                </div>
                <Separator />
                <div className="space-y-3">
                  <TrustScoreBar label="Identity Confidence" value={identityConf} />
                  <TrustScoreBar label="Data Freshness" value={freshness} />
                  <TrustScoreBar label="Signal Confidence" value={signalConf} />
                </div>
                <Separator />
                <div className="text-xs text-muted-foreground space-y-1.5 leading-relaxed">
                  <p className="font-medium text-foreground">Scoring Weights</p>
                  <p>Identity: 40% · Freshness: 30% · Signal: 30%</p>
                </div>
              </CardContent>
            </Card>

            {r.status === "pending" && (
              <Card>
                <CardContent className="pt-4 space-y-2">
                  <Button
                    className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => setApproveOpen(true)}
                    data-testid="button-approve"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve and Execute
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full gap-2 text-red-500 border-red-500/30 hover:bg-red-500/10"
                    onClick={() => {
                      setRejectOpen(true);
                      setRejectReason("");
                    }}
                    data-testid="button-reject"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent data-testid="dialog-approve-detail">
          <AlertDialogHeader>
            <AlertDialogTitle>Approve and Execute Action</AlertDialogTitle>
            <AlertDialogDescription>
              This will simulate reclaiming the {r.licenceSku} licence from {r.displayName}, saving{" "}
              {formatCurrency(r.monthlyCost)}/month. The outcome will be logged to the Savings Ledger.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approve.mutate({ id: r.id })}
              disabled={approve.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
              data-testid="button-confirm-approve-detail"
            >
              {approve.isPending ? "Executing..." : "Confirm Approval"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent data-testid="dialog-reject-detail">
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Recommendation</AlertDialogTitle>
            <AlertDialogDescription>Provide a reason for rejecting this recommendation.</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Label className="text-xs text-muted-foreground mb-1.5 block">Reason</Label>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. User is on extended leave..."
              rows={3}
              data-testid="input-reject-reason-detail"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reject.mutate({ id: r.id, data: { reason: rejectReason } })}
              disabled={reject.isPending || !rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
              data-testid="button-confirm-reject-detail"
            >
              {reject.isPending ? "Rejecting..." : "Confirm Rejection"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
