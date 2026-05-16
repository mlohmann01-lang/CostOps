import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TrustSnapshot = any;
type Finding = any;

const bandClass = (band?: string) => band === "HIGH" ? "bg-emerald-500" : band === "MEDIUM" ? "bg-blue-500" : band === "LOW" ? "bg-amber-500" : "bg-red-600";

export default function ConnectorsM365() {
  const [status, setStatus] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [trust, setTrust] = useState<TrustSnapshot[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);

  const load = async () => {
    const [statusRes, evidenceRes, trustRes, findingsRes] = await Promise.all([
      fetch("/api/connectors/m365/status"),
      fetch("/api/connectors/m365/evidence"),
      fetch("/api/connectors/m365/trust"),
      fetch("/api/connectors/m365/reconciliation-findings"),
    ]);
    setStatus(await statusRes.json());
    setEvidence(await evidenceRes.json());
    setTrust(await trustRes.json());
    setFindings(await findingsRes.json());
  };

  useEffect(() => { void load(); }, []);

  const latestTrust = trust[0];
  const openFindings = useMemo(() => findings.filter((f) => f.status === "OPEN"), [findings]);

  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">M365 Connector</h1>
    <Badge>Read-only connector mode. No licence changes or user changes can be made from this connector.</Badge>
    <p className="text-sm text-muted-foreground">Trust score determines whether evidence can safely generate executable recommendations.</p>

    <div className="flex gap-2"><Button onClick={async()=>{setSummary(await (await fetch('/api/connectors/m365/sync/read-only',{method:'POST'})).json()); await load();}}>Run Read-only Sync</Button>
    <Button variant="outline" onClick={async()=>setSummary(await (await fetch('/api/connectors/m365/evaluate-playbooks',{method:'POST'})).json())}>Evaluate Playbooks</Button></div>

    <Card>
      <CardHeader><CardTitle>Connector Trust</CardTitle></CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">Band: <Badge className={bandClass(latestTrust?.trustBand)}>{latestTrust?.trustBand ?? "N/A"}</Badge> Score: <span className="font-mono">{Number(latestTrust?.trustScore ?? 0).toFixed(1)}</span></div>
        <div>Freshness: {Number(latestTrust?.freshnessScore ?? 0).toFixed(1)} · Completeness: {Number(latestTrust?.completenessScore ?? 0).toFixed(1)} · Consistency: {Number(latestTrust?.consistencyScore ?? 0).toFixed(1)}</div>
        <div>Identity confidence: {Number(latestTrust?.identityMatchScore ?? 0).toFixed(1)} · Source reliability: {Number(latestTrust?.sourceReliabilityScore ?? 0).toFixed(1)}</div>
        <div>Critical findings: {(latestTrust?.criticalFindings ?? []).length} {(latestTrust?.criticalFindings ?? []).join(", ")}</div>
        <div>Warning findings: {(latestTrust?.warningFindings ?? []).length} {(latestTrust?.warningFindings ?? []).join(", ")}</div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader><CardTitle>Reconciliation Findings</CardTitle></CardHeader>
      <CardContent>
        <div className="text-xs mb-2">Open findings: {openFindings.length}</div>
        <div className="space-y-2">
          {findings.slice(0, 30).map((f) => <div key={f.id} className="border rounded p-2 text-xs space-y-1">
            <div className="flex items-center gap-2"><Badge>{f.status}</Badge><Badge variant="outline">{f.severity}</Badge><span className="font-medium">{f.findingType}</span><span>{f.entityId}</span></div>
            <div>{f.description}</div>
            <div className="text-muted-foreground">Resolution: {f.recommendedResolution}</div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={f.status !== "OPEN"} onClick={async()=>{await fetch(`/api/connectors/m365/reconciliation-findings/${f.id}/resolve`,{method:"POST"}); await load();}}>Resolve</Button>
              <Button size="sm" variant="outline" disabled={f.status !== "OPEN"} onClick={async()=>{await fetch(`/api/connectors/m365/reconciliation-findings/${f.id}/suppress`,{method:"POST"}); await load();}}>Suppress</Button>
            </div>
          </div>)}
        </div>
      </CardContent>
    </Card>

    <Card><CardHeader><CardTitle>Trust-aware Evaluation Result</CardTitle></CardHeader><CardContent><pre className="text-xs">{JSON.stringify(summary, null, 2)}</pre></CardContent></Card>
    <pre className="text-xs">{JSON.stringify(status, null, 2)}</pre>
    <h2 className="text-lg">Evidence Records</h2><pre className="text-xs">{JSON.stringify(evidence.slice(0,20), null, 2)}</pre>
  </div></Layout>;
}
