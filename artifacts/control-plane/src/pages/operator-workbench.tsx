import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type QueueSummary = Record<string, number> & { tenantId?: string; positioning?: string };

export default function OperatorWorkbenchPage() {
  const [data, setData] = useState<QueueSummary>({});
  useEffect(() => { fetch("/api/enterprise/operator-workbench?tenantId=default").then((r) => r.json()).then(setData); }, []);
  const cards = [
    ["pending approvals", data.pendingApprovals ?? 0], ["blocked recommendations", data.blockedRecommendations ?? 0], ["suppressed recommendations", data.suppressedRecommendations ?? 0],
    ["failed jobs", data.failedJobs ?? 0], ["dead-letter jobs", data.deadLetterJobs ?? 0], ["open drift events", data.openDriftEvents ?? 0],
    ["reconciliation findings", data.reconciliationFindings ?? 0], ["active exceptions", data.activeExceptions ?? 0], ["operationalization blockers", data.operationalizationBlockers ?? 0],
  ] as const;
  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Operator Workbench</h1><p className="text-sm text-muted-foreground">{data.positioning}</p>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{cards.map(([label,count])=><Card key={label}><CardHeader><CardTitle className="text-sm">{label}</CardTitle></CardHeader><CardContent><div className="flex items-center justify-between"><span className="text-2xl font-bold">{count}</span><Badge variant={count>0?"destructive":"secondary"}>{count>0?"attention":"ok"}</Badge></div></CardContent></Card>)}</div>
    <Card><CardHeader><CardTitle>Evidence</CardTitle></CardHeader><CardContent><details><summary>View JSON evidence</summary><pre className="text-xs mt-2">{JSON.stringify(data, null, 2)}</pre></details></CardContent></Card>
  </div></Layout>;
}
