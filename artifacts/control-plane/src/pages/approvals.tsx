import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";

export default function ApprovalsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const load = () => fetch("/api/approvals?tenantId=default").then(r=>r.json()).then(setRows);
  useEffect(() => { load(); }, []);
  const approve = async (id:number) => { await fetch(`/api/approvals/${id}/approve`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({actorId:"approver@contoso.com",reason:"approved from ui"})}); load(); };
  const reject = async (id:number) => { await fetch(`/api/approvals/${id}/reject`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({actorId:"approver@contoso.com",reason:"rejected from ui"})}); load(); };
  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Approvals</h1>{rows.map((r)=><div key={r.id} className="border rounded p-3 text-sm"><div className="font-mono">rec {r.recommendationId} · {r.status}</div><div>{r.reason}</div><div className="mt-2 flex gap-2">{r.status==="PENDING" && <><Button size="sm" onClick={()=>approve(r.id)}>Approve</Button><Button size="sm" variant="outline" onClick={()=>reject(r.id)}>Reject</Button></>}</div></div>)}</div></Layout>;
}
