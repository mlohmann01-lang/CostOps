import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EventRow = { source?: string; severity?: string; timestamp?: string; summary?: string; evidence?: unknown };

export default function EvidenceExplorerPage() {
  const [tenantId, setTenantId] = useState("default");
  const [entityType, setEntityType] = useState("all");
  const [entityId, setEntityId] = useState("");
  const [rows, setRows] = useState<EventRow[]>([]);
  useEffect(() => { fetch(`/api/enterprise/evidence?tenantId=${tenantId}`).then((r) => r.json()).then((d) => setRows([...(d.mappings ?? []), ...(d.packEvents ?? [])])); }, [tenantId]);
  const filtered = rows.filter((r) => (entityType === "all" || (r.source ?? "").toLowerCase().includes(entityType)) && (!entityId || JSON.stringify(r).includes(entityId)));
  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Evidence Explorer</h1><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Input value={tenantId} onChange={(e)=>setTenantId(e.target.value)} placeholder="tenantId" /><Select value={entityType} onValueChange={setEntityType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="m365">M365</SelectItem><SelectItem value="flexera">Flexera</SelectItem><SelectItem value="servicenow">ServiceNow</SelectItem></SelectContent></Select><Input value={entityId} onChange={(e)=>setEntityId(e.target.value)} placeholder="entityId" /></div>
  <Card><CardHeader><CardTitle>Timeline</CardTitle></CardHeader><CardContent>{filtered.length===0?<p className="text-sm text-muted-foreground">No evidence events found.</p>:<div className="space-y-2">{filtered.map((row,i)=><details key={i} className="border rounded p-2"><summary className="text-sm">{row.summary ?? row.source ?? "event"} • {row.severity ?? "INFO"} • {row.timestamp ?? "n/a"}</summary><pre className="text-xs mt-2">{JSON.stringify(row.evidence ?? row, null, 2)}</pre></details>)}</div>}</CardContent></Card></div></Layout>;
}
