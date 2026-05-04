import { useListOutcomes } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Activity } from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/format";

export default function ExecutionLog() {
  const outcomes = useListOutcomes({ limit: 100 });

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Execution Log</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Chronological audit log of all approved and executed actions
          </p>
        </div>

        <div className="relative">
          {outcomes.isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : !outcomes.data?.length ? (
            <div className="py-20 text-center">
              <Activity className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No executions yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Approve recommendations to see execution events here
              </p>
            </div>
          ) : (
            <div className="space-y-0 relative before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-px before:bg-border">
              {outcomes.data.map((o, i) => (
                <div
                  key={o.id}
                  className="flex gap-5 pb-6"
                  data-testid={`log-entry-${o.id}`}
                >
                  <div className="relative z-10 mt-1">
                    <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                  </div>

                  <Card className="flex-1">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold">{o.displayName}</span>
                            <Badge variant="outline" className="text-xs font-mono">
                              {o.action.replace(/_/g, " ")}
                            </Badge>
                            <Badge variant="outline" className="text-xs text-green-500 border-green-500/30 bg-green-500/10">
                              executed
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{o.userEmail}</p>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>SKU: <span className="font-semibold text-foreground">{o.licenceSku}</span></span>
                            <span>
                              Before: <span className="font-semibold text-foreground">{formatCurrency(o.beforeCost)}/mo</span>
                            </span>
                            <span>
                              After: <span className="font-semibold text-foreground">{formatCurrency(o.afterCost)}/mo</span>
                            </span>
                            <span className="text-xs font-mono bg-secondary/50 px-1.5 py-0.5 rounded">
                              {o.executionMode.split("_").slice(0, 2).join(" ")}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold text-primary">
                            +{formatCurrency(o.monthlySaving)}/mo
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatCurrency(o.annualisedSaving)}/yr
                          </p>
                          {o.executedAt && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {formatDateTime(o.executedAt)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
