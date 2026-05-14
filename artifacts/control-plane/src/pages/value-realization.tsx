import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ValueRealizationPage() {
  const [data, setData] = useState<Record<string, unknown>>({});
  useEffect(() => { fetch("/api/enterprise/value-realization?tenantId=default").then((r)=>r.json()).then(setData); }, []);
  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Value Realization</h1><Card><CardHeader><CardTitle>Opportunity Funnel</CardTitle></CardHeader><CardContent><pre className="text-xs">{JSON.stringify((data as any).funnel ?? { discovered:(data as any).annualSpendInScope, recommended:0, approved:0, executed:0, verified:0 }, null, 2)}</pre></CardContent></Card><Card><CardHeader><CardTitle>Savings confidence / blocked reasons / playbook performance / maturity</CardTitle></CardHeader><CardContent><pre className="text-xs">{JSON.stringify(data, null, 2)}</pre></CardContent></Card></div></Layout>;
}
