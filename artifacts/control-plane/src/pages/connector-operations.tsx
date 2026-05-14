import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConnectorOperationsPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { fetch("/api/enterprise/connector-operations").then((r)=>r.json()).then((d)=>setRows(d.connectors ?? [])); }, []);
  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Connector Operations</h1><div className="grid grid-cols-1 xl:grid-cols-3 gap-4">{["M365","FLEXERA","SERVICENOW"].map((c)=><Card key={c}><CardHeader><CardTitle>{c}</CardTitle></CardHeader><CardContent><pre className="text-xs">{JSON.stringify(rows.find((r)=>String(r.connector).includes(c)) ?? {}, null, 2)}</pre><div className="flex gap-2 mt-2"><Button size="sm" variant="outline">readiness</Button><Button size="sm" variant="outline">smoke test</Button><Button size="sm" variant="outline">sync</Button><Button size="sm" variant="outline">jobs history</Button></div></CardContent></Card>)}</div></div></Layout>;
}
