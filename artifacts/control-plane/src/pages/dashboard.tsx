import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDashboardSummary,
  useGetSavingsTrend,
  useGetActionBreakdown,
  useListRecommendations,
  useGenerateRecommendations,
  getListRecommendationsQueryKey,
  getGetDashboardSummaryQueryKey,
  getGetSavingsTrendQueryKey,
  getGetActionBreakdownQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plug,
  Zap,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatCompactCurrency, getTrustScoreColor, getExecutionStatusColor } from "@/lib/format";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type RecommendationWithPricing = {
  id: number;
  displayName: string;
  userEmail: string;
  licenceSku: string;
  daysSinceActivity: number | null;
  trustScore: number;
  executionStatus: string;
  monthlyCost: number;
  annualisedCost: number;
  pricingConfidence?: string;
  pricingSource?: string;
};

const STATUS_COLORS: Record<string, string> = {
  AUTO_EXECUTE: "#22c55e",
  APPROVAL_REQUIRED: "#f59e0b",
  INVESTIGATE: "#f97316",
  BLOCKED: "#ef4444",
};

function isVerified(confidence?: string) {
  return confidence === "VERIFIED_CONTRACT" || confidence === "VERIFIED_INVOICE" || confidence === "VERIFIED_CSP";
}

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

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const summary = useGetDashboardSummary();
  const trend = useGetSavingsTrend();
  const breakdown = useGetActionBreakdown();
  const recommendations = useListRecommendations({ status: "pending" });
  const generate = useGenerateRecommendations({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getListRecommendationsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSavingsTrendQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetActionBreakdownQueryKey() });
        toast({ title: `${data.generated} recommendation(s) generated` });
      },
    },
  });

  const metricCards = [
    {
      label: "Monthly Savings Realised",
      value: summary.data ? formatCompactCurrency(summary.data.totalMonthlySavings) : null,
      sub: summary.data ? `${formatCompactCurrency(summary.data.totalAnnualisedSavings)} annualised` : null,
      icon: TrendingUp,
      color: "text-primary",
      testId: "metric-monthly-savings",
    },
    {
      label: "Pending Recommendations",
      value: summary.data?.pendingRecommendations?.toString() ?? null,
      sub: "Awaiting review",
      icon: AlertCircle,
      color: "text-amber-500",
      testId: "metric-pending",
    },
    {
      label: "Actions Executed",
      value: summary.data?.executedActions?.toString() ?? null,
      sub: summary.data ? formatCompactCurrency(summary.data.savingsThisMonth) + " this month" : null,
      icon: CheckCircle2,
      color: "text-green-500",
      testId: "metric-executed",
    },
    {
      label: "Blocked Actions",
      value: summary.data?.blockedActions?.toString() ?? null,
      sub: summary.data ? `${summary.data.activeConnectors} connectors active` : null,
      icon: XCircle,
      color: "text-red-500",
      testId: "metric-blocked",
    },
  ];

  const pending = (recommendations.data ?? []) as RecommendationWithPricing[];
  const verifiedMonthly = pending.filter((r) => isVerified(r.pricingConfidence)).reduce((sum, r) => sum + r.monthlyCost, 0);
  const estimatedMonthly = pending.filter((r) => !isVerified(r.pricingConfidence)).reduce((sum, r) => sum + r.monthlyCost, 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Command Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time view of your cost optimisation execution pipeline
            </p>
          </div>
          <Button
            data-testid="button-generate-recommendations"
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

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {metricCards.map((card) => (
            <Card key={card.label} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                      {card.label}
                    </p>
                    {summary.isLoading ? (
                      <Skeleton className="h-8 w-24" />
                    ) : (
                      <p
                        className="text-3xl font-bold tracking-tight"
                        data-testid={card.testId}
                      >
                        {card.value ?? "—"}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{card.sub ?? ""}</p>
                  </div>
                  <card.icon className={`w-5 h-5 ${card.color} mt-1`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                Savings Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trend.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trend.data ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${v}`}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(220 20% 8%)",
                        border: "1px solid hsl(220 15% 15%)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => [formatCurrency(v), "Savings"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="savings"
                      stroke="hsl(174 80% 42%)"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                Action Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {breakdown.isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={breakdown.data ?? []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 15% 15%)" />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 10, fill: "hsl(210 20% 50%)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "hsl(210 20% 50%)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(220 20% 8%)",
                        border: "1px solid hsl(220 15% 15%)",
                        borderRadius: 6,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {(breakdown.data ?? []).map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] ?? "#6b7280"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Recommendations Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
              Pending Actions
            </CardTitle>
            <Link href="/recommendations" data-testid="link-view-all-recommendations">
              <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
            </Link>
          </CardHeader>
          <div className="px-6 pb-2 text-xs text-muted-foreground">
            Verified pipeline: {formatCompactCurrency(verifiedMonthly)}/mo · Estimated pipeline: {formatCompactCurrency(estimatedMonthly)}/mo
          </div>
          <CardContent className="p-0">
            {recommendations.isLoading ? (
              <div className="px-6 py-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !recommendations.data?.length ? (
              <div className="px-6 py-8 text-center">
                <CheckCircle2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pending recommendations</p>
                <p className="text-xs text-muted-foreground mt-1">Run playbooks to detect optimisation opportunities</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {pending.slice(0, 5).map((rec) => (
                  <Link key={rec.id} href={`/recommendations/${rec.id}`}>
                    <div
                      className="flex items-center justify-between px-6 py-3 hover:bg-secondary/50 transition-colors cursor-pointer"
                      data-testid={`row-recommendation-${rec.id}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{rec.displayName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {rec.userEmail} · {rec.licenceSku} · {rec.daysSinceActivity}d inactive
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {pricingLabel(rec.pricingConfidence)} · {rec.pricingSource || "—"} · {formatCurrency(rec.annualisedCost)}/yr
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-4">
                        <Badge
                          variant="outline"
                          className={`text-xs ${getTrustScoreColor(rec.trustScore)}`}
                          data-testid={`badge-trust-${rec.id}`}
                        >
                          {(rec.trustScore * 100).toFixed(0)}%
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${getExecutionStatusColor(rec.executionStatus)}`}
                        >
                          {rec.executionStatus.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-sm font-semibold text-primary">
                          {formatCurrency(rec.monthlyCost)}/mo
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
