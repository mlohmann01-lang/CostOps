import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo, useState } from "react";

type AppRow = { evidence?: { blockers?: string[]; recommendedNextActions?: string[]; ownerConfidence?: number; ownerSource?: string }; owner?: string | null; displayName: string; vendor: string } & Record<string, any>;

export default function OperationalizationPage() {
  const [summary, setSummary] = useState<any>();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const tenantId = "default";
  const [packs, setPacks] = useState<any[]>([]);
  const [packEvents, setPackEvents] = useState<any[]>([]);
  const [packDetail, setPackDetail] = useState<any>(null);

  const runPack = async (packType: string) => {
    const result = await fetch("/api/operationalization/packs/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tenantId, packType }) }).then((r) => r.json());
    setPackDetail(result);
    setPacks(await fetch(`/api/operationalization/packs?tenantId=${tenantId}`).then((r) => r.json()));
    setPackEvents(await fetch(`/api/operationalization/packs/events?tenantId=${tenantId}`).then((r) => r.json()));
  };


  const blockerSummary = useMemo(() => {
    const all = apps.flatMap((a) => a.evidence?.blockers ?? []);
    const count = (k: string) => all.filter((b) => b === k).length;
    return { missingOwner: count("OWNER_MISSING"), pricingUnknown: count("PRICING_UNKNOWN"), entitlementUnmapped: count("ENTITLEMENTS_UNMAPPED"), reconciliationConflict: count("RECONCILIATION_CONFLICT") };
  }, [apps]);

  const run = async () => {
    const s = await fetch("/api/operationalization/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tenantId }) }).then((r) => r.json());
    setSummary(s);
    setApps(await fetch(`/api/operationalization/apps?tenantId=${tenantId}`).then((r) => r.json()));
    setEdges(await fetch(`/api/operationalization/ownership-edges?tenantId=${tenantId}`).then((r) => r.json()));
    setMappings(await fetch(`/api/operationalization/metadata-mappings?tenantId=${tenantId}`).then((r) => r.json()));
  };

  return <Layout><div className="space-y-4"><div className="flex justify-between"><h1 className="text-2xl font-semibold">Operationalization</h1><Button onClick={run}>Run Assessment</Button></div>
    <Card><CardHeader><CardTitle>Readiness Summary + Top Blockers</CardTitle></CardHeader><CardContent><pre>{JSON.stringify({ summary, blockerSummary }, null, 2)}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Prioritized Apps (owner confidence/source, blockers, next actions)</CardTitle></CardHeader><CardContent><pre>{JSON.stringify(apps.map((a) => ({ app: a.displayName, vendor: a.vendor, owner: a.owner, ownerConfidence: a.evidence?.ownerConfidence, ownerSource: a.evidence?.ownerSource, blockers: a.evidence?.blockers, recommendedNextActions: a.evidence?.recommendedNextActions, priorityScore: a.priorityScore, status: a.status })), null, 2)}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Ownership Gaps</CardTitle></CardHeader><CardContent><pre>{JSON.stringify(edges.filter((e) => !e.owner || !e.costCenter).slice(0, 20), null, 2)}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Canonical Alias Mapping Events</CardTitle></CardHeader><CardContent><pre>{JSON.stringify(mappings.slice(0, 20), null, 2)}</pre></CardContent></Card>
  <Card><CardHeader><CardTitle>Operationalization Packs</CardTitle></CardHeader><CardContent><div className="flex gap-2 mb-3"><Button onClick={() => runPack("SERVICENOW_SAM_ACCELERATION")}>Run ServiceNow SAM Pack</Button><Button onClick={() => runPack("FLEXERA_VALUE_REALIZATION")}>Run Flexera Value Pack</Button></div><pre>{JSON.stringify(packs.map((p) => ({ packType: p.packType, readinessScore: p.readinessScore, appsReady: p.appsReady, appsBlocked: p.appsBlocked, blockersSummary: p.blockersSummary, lastUpdated: p.updatedAt })), null, 2)}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Pack Detail View</CardTitle></CardHeader><CardContent><pre>{JSON.stringify({ packDetail, readinessDiagnostics: packDetail?.evidence, blockers: packDetail?.blockersSummary, nextActions: packDetail?.recommendationsSummary, topPriorityApps: packDetail?.evidence?.evaluation?.topPriorityApps }, null, 2)}</pre></CardContent></Card>
    <Card><CardHeader><CardTitle>Pack Events Timeline</CardTitle></CardHeader><CardContent><pre>{JSON.stringify(packEvents.slice(0, 50), null, 2)}</pre></CardContent></Card>
  </div></Layout>;
}
