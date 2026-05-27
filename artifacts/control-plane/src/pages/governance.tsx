import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";

export default function GovernancePage(){
  const [policies,setPolicies]=useState<any[]>([]);
  const [evaluations,setEvaluations]=useState<any[]>([]);
  useEffect(()=>{ fetch('/api/governance/policies?tenantId=default').then(r=>r.json()).then(d=>setPolicies(Array.isArray(d)?d:[])).catch(()=>{}); fetch('/api/governance/evaluations?tenantId=default').then(r=>r.json()).then(d=>setEvaluations(Array.isArray(d)?d:[])).catch(()=>{}); },[]);
  const health = { staleApprovals: evaluations.filter((e:any)=>e.evaluationReason==='APPROVAL_EXPIRED').length, staleDryRuns: evaluations.filter((e:any)=>e.evaluationReason==='DRY_RUN_EXPIRED').length, degradedConnectors: evaluations.filter((e:any)=>e.evaluationReason==='CONNECTOR_DEGRADED').length, verificationFailures: evaluations.filter((e:any)=>String(e.evaluationResult)==='FAIL').length, pendingRechecks: evaluations.filter((e:any)=>String(e.evaluationResult)==='WARN').length, driftDetected: evaluations.filter((e:any)=>String(e.evaluationReason).includes('DRIFT')).length };
  return <Layout><div className="space-y-6"><h1 className="text-2xl font-semibold">Governance Policies</h1>
    <p className="text-sm text-muted-foreground">Policies are deterministic, versioned, and replay-safe.</p>
    <section><h2 className="font-medium">Governance Health</h2><div className="grid grid-cols-2 gap-2 text-sm"><div>Stale approvals: {health.staleApprovals}</div><div>Stale dry runs: {health.staleDryRuns}</div><div>Drift detected: {health.driftDetected}</div><div>Degraded connectors: {health.degradedConnectors}</div><div>Verification failures: {health.verificationFailures}</div><div>Pending rechecks: {health.pendingRechecks}</div></div></section><section><h2 className="font-medium">Active Policies / Versions</h2>{policies.map((p)=><div key={p.id} className="text-sm border rounded p-2 my-2"><div>{p.policyName} · key={p.policyKey} · category={p.policyCategory}</div><div>status={p.policyStatus} · version={p.policyVersion} · scope={p.scopeType} · precedence=BLOCK→REQUIRE_APPROVAL→WARN→ALLOW</div><div>definition: {JSON.stringify(p.policyDefinition)}</div></div>)}</section>
    <section><h2 className="font-medium">Evaluation Outcomes / Enforcement Traces</h2>{evaluations.map((e)=><div key={e.id} className="text-sm border rounded p-2 my-2">target={e.evaluationTargetType}:{e.evaluationTargetId} · outcome={e.evaluationOutcome} · policy={e.policyId}@{e.policyVersion}<div>reasoning: {JSON.stringify(e.evaluationReasoning)}</div><div>hash: {e.deterministicHash}</div></div>)}</section>
  </div></Layout>
}
