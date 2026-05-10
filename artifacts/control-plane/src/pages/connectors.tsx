import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListConnectors,
  useSyncConnector,
  useGenerateRecommendations,
  getListConnectorsQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, AlertTriangle, CheckCircle2, XCircle, Wifi, Cloud, Server, Globe, Users, MessageSquare, Code, Video } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import { useToast } from "@/hooks/use-toast";

const CONNECTOR_ICONS: Record<string, React.ElementType> = {
  m365: Users,
  aws: Cloud,
  azure: Server,
  salesforce: Globe,
  slack: MessageSquare,
  github: Code,
  zoom: Video,
  gcp: Cloud,
};

const CONNECTOR_COLORS: Record<string, string> = {
  m365: "text-[#00a4ef]",
  aws: "text-[#ff9900]",
  azure: "text-[#0078d4]",
  salesforce: "text-[#00a1e0]",
  slack: "text-[#611f69]",
  github: "text-foreground",
  zoom: "text-[#2d8cff]",
  gcp: "text-[#4285f4]",
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10 gap-1.5 text-xs">
          <CheckCircle2 className="w-3 h-3" />
          Connected
        </Badge>
      );
    case "syncing":
      return (
        <Badge variant="outline" className="text-blue-500 border-blue-500/30 bg-blue-500/10 gap-1.5 text-xs">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Syncing
        </Badge>
      );
    case "error":
      return (
        <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 gap-1.5 text-xs">
          <AlertTriangle className="w-3 h-3" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground gap-1.5 text-xs">
          <XCircle className="w-3 h-3" />
          Disconnected
        </Badge>
      );
  }
}

export default function Connectors() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const connectors = useListConnectors();

  const sync = useSyncConnector({
    mutation: {
      onSuccess: (data: any) => {
        queryClient.invalidateQueries({ queryKey: getListConnectorsQueryKey() });
        toast({ title: `${data.name} sync triggered` });
      },
      onError: () => {
        toast({ title: "Sync failed", variant: "destructive" });
      },
    },
  });
  const generate = useGenerateRecommendations({
    mutation: {
      onSuccess: (data: any) => toast({ title: `${data.generated} recommendation(s) generated` }),
      onError: () => toast({ title: "Recommendation generation failed", variant: "destructive" }),
    },
  });

  const [readiness, setReadiness] = React.useState<any | null>(null);
  const [smokeResult, setSmokeResult] = React.useState<any | null>(null);
  const [loadingReadiness, setLoadingReadiness] = React.useState(false);
  const [loadingSmoke, setLoadingSmoke] = React.useState(false);

  const checkReadiness = async () => {
    setLoadingReadiness(true);
    try {
      const res = await fetch("/api/connectors/m365/readiness");
      const data = await res.json();
      setReadiness(data);
    } finally {
      setLoadingReadiness(false);
    }
  };


  const runFullSync = async (connector: any) => {
    if (connector.type !== "m365") {
      sync.mutate({ id: connector.id });
      return;
    }
    try {
      const res = await fetch("/api/connectors/m365/sync", { method: "POST" });
      const data = await res.json();
      toast({ title: `M365 sync complete (${data.usersSynced ?? 0} users)` });
      queryClient.invalidateQueries({ queryKey: getListConnectorsQueryKey() });
    } catch {
      toast({ title: "M365 sync failed", variant: "destructive" });
    }
  };

  const runSmokeTest = async () => {
    setLoadingSmoke(true);
    try {
      const res = await fetch("/api/connectors/m365/smoke-test", { method: "POST" });
      const data = await res.json();
      setSmokeResult(data);
    } finally {
      setLoadingSmoke(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Data Trust Layer</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor connected data sources and their signal quality
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3.5 h-3.5 text-green-500" />
            {connectors.data?.filter((c: any) => c.status === "connected" || c.status === "syncing").length ?? 0} active
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
            {connectors.data?.filter((c: any) => c.status === "disconnected" || c.status === "error").length ?? 0} inactive
          </div>
        </div>

        {connectors.isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {connectors.data?.map((connector: any) => {
              const Icon = CONNECTOR_ICONS[connector.type] ?? Wifi;
              const iconColor = CONNECTOR_COLORS[connector.type] ?? "text-foreground";
              const trustPct = Math.round(connector.trustScore * 100);

              return (
                <Card key={connector.id} className="relative" data-testid={`card-connector-${connector.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                          <Icon className={`w-5 h-5 ${iconColor}`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">{connector.name}</CardTitle>
                          <p className="text-xs text-muted-foreground uppercase font-mono mt-0.5">
                            {connector.type}
                          </p>
                        </div>
                      </div>
                      <StatusBadge status={connector.status} />
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Trust Score</span>
                        <span
                          className={
                            trustPct >= 90
                              ? "text-green-500"
                              : trustPct >= 75
                              ? "text-amber-500"
                              : trustPct >= 50
                              ? "text-orange-500"
                              : "text-red-500"
                          }
                          data-testid={`text-trust-${connector.id}`}
                        >
                          {trustPct}%
                        </span>
                      </div>
                      <Progress
                        value={connector.status === "disconnected" ? 0 : trustPct}
                        className="h-1.5"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-muted-foreground">Records</p>
                        <p className="font-semibold mt-0.5">{connector.recordCount.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Last Sync</p>
                        <p className="mt-0.5">
                          {connector.lastSync ? formatDateTime(connector.lastSync) : "Never"}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-2 text-xs"
                      onClick={() => runFullSync(connector)}
                      disabled={sync.isPending || connector.status === "syncing" || (connector.type === "m365" && readiness?.status === "BLOCKED")}
                      data-testid={`button-sync-${connector.id}`}
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          sync.isPending || connector.status === "syncing" ? "animate-spin" : ""
                        }`}
                      />
                      {connector.status === "syncing" ? "Syncing..." : "Run Full Sync"}
                    </Button>

                    {connector.type === "m365" && (
                      <div className="space-y-2 pt-1">
                        <div className="grid grid-cols-2 gap-2">
                          <Button size="sm" variant="secondary" className="text-xs" onClick={checkReadiness} disabled={loadingReadiness}>
                            {loadingReadiness ? "Checking..." : "Check Readiness"}
                          </Button>
                          <Button size="sm" variant="secondary" className="text-xs" onClick={runSmokeTest} disabled={loadingSmoke}>
                            {loadingSmoke ? "Running..." : "Run Smoke Test"}
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          disabled={generate.isPending || readiness?.status === "BLOCKED"}
                          onClick={() => generate.mutate()}
                        >
                          {generate.isPending ? "Generating..." : "Generate Recommendations"}
                        </Button>
                        {readiness && (
                          <div className="rounded-md border p-2 text-xs space-y-1">
                            <p><span className="font-semibold">Readiness:</span> {readiness.status}</p>
                            <p><span className="font-semibold">Missing required:</span> {(readiness.missingRequired ?? []).join(", ") || "None"}</p>
                            <p><span className="font-semibold">Missing optional:</span> {(readiness.missingOptional ?? []).join(", ") || "None"}</p>
                            <p><span className="font-semibold">Warnings:</span> {(readiness.warnings ?? []).join(" | ") || "None"}</p>
                            <p className="truncate"><span className="font-semibold">Evidence:</span> {JSON.stringify(readiness.evidence ?? {})}</p>
                          </div>
                        )}
                        {smokeResult && (
                          <div className="rounded-md border p-2 text-xs space-y-1">
                            <p><span className="font-semibold">Smoke:</span> {smokeResult.status} ({smokeResult.connectorHealth})</p>
                            <p><span className="font-semibold">Counts:</span> users {smokeResult.counts?.usersFetched ?? 0}, licences {smokeResult.counts?.licencesFetched ?? 0}, activity {smokeResult.counts?.activityFetched ?? 0}, normalized {smokeResult.counts?.normalizedUsers ?? 0}</p>
                            <p><span className="font-semibold">Request IDs:</span> {(smokeResult.requestIds ?? []).join(", ") || "None"}</p>
                            <p><span className="font-semibold">Warnings:</span> {(smokeResult.warnings ?? []).join(" | ") || "None"}</p>
                            <p><span className="font-semibold">Errors:</span> {(smokeResult.errors ?? []).join(" | ") || "None"}</p>
                            <p><span className="font-semibold">Sample:</span> {JSON.stringify(smokeResult.sample ?? [])}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
