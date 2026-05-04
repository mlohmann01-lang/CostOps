import { useState } from "react";
import { useListOutcomes, useGetOutcomesSummary } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatDateTime, formatCompactCurrency } from "@/lib/format";

export default function Outcomes() {
  const summary = useGetOutcomesSummary();
  const outcomes = useListOutcomes();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Savings Ledger</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immutable audit trail of all executed optimisation actions and realised savings
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
                Total Monthly Saving
              </p>
              {summary.isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <p className="text-3xl font-bold text-primary" data-testid="text-total-monthly-saving">
                  {formatCompactCurrency(summary.data?.totalMonthlySaving ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
                Annualised Saving
              </p>
              {summary.isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <p className="text-3xl font-bold" data-testid="text-annualised-saving">
                  {formatCompactCurrency(summary.data?.totalAnnualisedSaving ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium mb-1">
                Actions Executed
              </p>
              {summary.isLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <p className="text-3xl font-bold" data-testid="text-actions-executed">
                  {summary.data?.totalActionsExecuted ?? 0}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="p-0">
          <CardHeader className="px-6 py-4 border-b border-border">
            <CardTitle className="text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Executed Outcomes
            </CardTitle>
          </CardHeader>

          {outcomes.isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : !outcomes.data?.length ? (
            <div className="py-16 text-center">
              <CheckCircle2 className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No executed outcomes yet</p>
              <p className="text-xs text-muted-foreground mt-1">Approve recommendations to see outcomes here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Before</TableHead>
                  <TableHead className="text-right">After</TableHead>
                  <TableHead className="text-right">Monthly Saving</TableHead>
                  <TableHead className="text-right">Annualised</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Executed</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outcomes.data.map((o) => (
                  <>
                    <TableRow
                      key={o.id}
                      className="cursor-pointer hover:bg-secondary/30"
                      onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                      data-testid={`row-outcome-${o.id}`}
                    >
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{o.displayName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{o.userEmail}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">
                          {o.action.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-semibold">{o.licenceSku}</TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(o.beforeCost)}/mo
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatCurrency(o.afterCost)}/mo
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold text-primary">
                        {formatCurrency(o.monthlySaving)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(o.annualisedSaving)}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground font-mono">
                          {o.executionMode.split("_").slice(0, 2).join(" ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {o.executedAt ? formatDateTime(o.executedAt) : "—"}
                      </TableCell>
                      <TableCell>
                        {expandedId === o.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </TableCell>
                    </TableRow>
                    {expandedId === o.id && (
                      <TableRow key={`${o.id}-expanded`}>
                        <TableCell colSpan={10} className="bg-secondary/20 px-6 py-3">
                          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Evidence</p>
                          <pre className="text-xs font-mono text-foreground/80 whitespace-pre-wrap">
                            {JSON.stringify(o.evidence, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </Layout>
  );
}
