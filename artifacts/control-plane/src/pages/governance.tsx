import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";

export default function GovernancePage(){
  const [policies,setPolicies]=useState<any[]>([]);
  const [evals,setEvals]=useState<any[]>([]);
  const [exceptions,setExceptions]=useState<any[]>([]);
  useEffect(()=>{ fetch('/api/governance/policies?tenantId=default').then(r=>r.json()).then(setPolicies); fetch('/api/governance/policy-evaluations?tenantId=default').then(r=>r.json()).then(setEvals); fetch('/api/governance/exceptions?tenantId=default').then(r=>r.json()).then(setExceptions); },[]);
  return <Layout><div className="space-y-4"><h1 className="text-2xl font-semibold">Governance</h1><div><h2 className="font-medium">Policies</h2>{policies.map((p)=><div key={p.id} className="text-sm border rounded p-2">{p.name} · {p.policyType} · enabled={p.enabled} · priority={p.priority}</div>)}</div><div><h2 className="font-medium">Latest Evaluations</h2>{evals.slice(0,20).map((e)=><div key={e.id} className="text-sm border rounded p-2">{e.decision} · rec {e.recommendationId ?? '—'}<pre className="text-xs">{JSON.stringify(e.reasons)}</pre></div>)}</div><div><h2 className="font-medium">Exception Management</h2>{exceptions.slice(0,30).map((e)=><div key={e.id} className="text-sm border rounded p-2">{e.status} · {e.exceptionType} · {e.targetType}:{e.targetId} · expires {String(e.expiresAt)}<pre className="text-xs">{JSON.stringify({reason:e.reason,businessJustification:e.businessJustification,riskAccepted:e.riskAccepted,evidence:e.evidence},null,2)}</pre></div>)}</div></div></Layout>
}
