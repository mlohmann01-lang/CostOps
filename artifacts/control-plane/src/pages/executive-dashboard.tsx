import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ExecutiveDashboardPage() {
  const [data, setData] = useState<Record<string, unknown>>({});
  useEffect(() => { fetch("/api/enterprise/executive-dashboard?tenantId=default").then((r) => r.json()).then(setData); }, []);
  const metrics = ["projectedSavings","partiallyVerifiedSavings","verifiedSavings","reversedSavings","governancePosture","connectorHealthSummary","operationalizationReadiness"];
  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Executive View</h1><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">{metrics.map((m)=><Card key={m}><CardHeader><CardTitle className="text-sm">{m}</CardTitle></CardHeader><CardContent><p className="text-xl font-semibold">{String((data as any)[m] ?? "—")}</p></CardContent></Card>)}</div><Card><CardHeader><CardTitle>Top risks / action items</CardTitle></CardHeader><CardContent><pre className="text-xs">{JSON.stringify((data as any).topRisks ?? data, null, 2)}</pre></CardContent></Card></div></Layout>;
}
