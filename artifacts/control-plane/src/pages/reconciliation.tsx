import * as React from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Finding = {
  id: number;
  severity: "INFO" | "WARNING" | "HIGH" | "CRITICAL";
  findingType: string;
  entityType: string;
  entityKey: string;
  sourcesInvolved: string[];
  status: string;
  createdAt: string;
  evidence: Record<string, unknown>;
};

function SeverityBadge({ severity }: { severity: Finding["severity"] }) {
  const cls = severity === "CRITICAL" ? "bg-red-500/20 text-red-400" : severity === "HIGH" ? "bg-orange-500/20 text-orange-400" : severity === "WARNING" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-300";
  return <Badge className={cls}>{severity}</Badge>;
}

export default function ReconciliationPage() {
  const [loading, setLoading] = React.useState(false);
  const [findings, setFindings] = React.useState<Finding[]>([]);
  const [expanded, setExpanded] = React.useState<number | null>(null);

  const load = React.useCallback(async () => {
    const res = await fetch("/api/reconciliation/findings?tenantId=contoso");
    const data = await res.json();
    setFindings(data.findings ?? []);
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const run = async () => {
    setLoading(true);
    try {
      await fetch("/api/reconciliation/run?tenantId=contoso", { method: "POST" });
      await load();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Reconciliation</h1>
            <p className="text-sm text-muted-foreground">Cross-source findings across M365, Flexera, and ServiceNow.</p>
          </div>
          <Button onClick={run} disabled={loading}>{loading ? "Running..." : "Run Reconciliation"}</Button>
        </div>
        <Card>
          <CardHeader><CardTitle>Findings</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {findings.map((f) => (
                <div key={f.id} className="border rounded p-3">
                  <div className="grid grid-cols-7 gap-2 text-sm items-center">
                    <SeverityBadge severity={f.severity} />
                    <div>{f.findingType}</div>
                    <div>{f.entityType}</div>
                    <div className="font-mono text-xs break-all">{f.entityKey}</div>
                    <div>{(f.sourcesInvolved ?? []).join(", ")}</div>
                    <div>{f.status}</div>
                    <div className="text-xs">{new Date(f.createdAt).toLocaleString()}</div>
                  </div>
                  <Button variant="link" className="px-0 text-xs" onClick={() => setExpanded(expanded === f.id ? null : f.id)}>View evidence</Button>
                  {expanded === f.id && <pre className="text-xs bg-secondary p-2 rounded overflow-auto">{JSON.stringify(f.evidence, null, 2)}</pre>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
