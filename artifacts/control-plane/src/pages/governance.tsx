import { useEffect, useState } from "react";
import { Layout } from "@/components/layout";

export default function GovernancePage(){
  const [policies,setPolicies]=useState<any[]>([]);
  const [approvals,setApprovals]=useState<any[]>([]);
  useEffect(()=>{ fetch('/api/governance/policies?tenantId=default').then(r=>r.json()).then(setPolicies); fetch('/api/governance/approvals?tenantId=default').then(r=>r.json()).then(setApprovals); },[]);
  const patchPolicy = async (id:number,enabled:boolean)=>{ await fetch(`/api/governance/policies/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled})}); setPolicies(await (await fetch('/api/governance/policies?tenantId=default')).json()); };
  const approve = async (id:number)=>{ await fetch(`/api/governance/approvals/${id}/approve`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}); setApprovals(await (await fetch('/api/governance/approvals?tenantId=default')).json()); };
  const reject = async (id:number)=>{ await fetch(`/api/governance/approvals/${id}/reject`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reason:'Rejected from console'})}); setApprovals(await (await fetch('/api/governance/approvals?tenantId=default')).json()); };
  return <Layout><div className="space-y-6"><h1 className="text-2xl font-semibold">Governance Console</h1>
    <section><h2 className="font-medium">Policy Library</h2>{policies.map((p)=><div key={p.id} className="text-sm border rounded p-2 my-2"><div>{p.policyName} · {p.policyType} · enabled={String(p.enabled)}</div><div>approvalRisk={p.requiresApprovalRiskClass ?? '—'} autoSafeRisk={p.maxAutoSafeRiskClass ?? '—'} blastRadius={p.maxAutoSafeBlastRadius ?? '—'} requiredApprovals={p.requiredApprovals}</div><div>restricted actions: {JSON.stringify(p.restrictedActionTypes)} playbooks: {JSON.stringify(p.restrictedPlaybooks)}</div><button className="mr-2 underline" onClick={()=>patchPolicy(p.id,!p.enabled)}>{p.enabled?'Disable':'Enable'} Policy</button><button className="underline">Edit Policy</button></div>)}</section>
    <section><h2 className="font-medium">Approval Queue</h2>{approvals.map((a)=><div key={a.id} className="text-sm border rounded p-2 my-2">{a.entityType}:{a.entityId} · {a.approvalStatus} · {a.currentApprovals}/{a.requiredApprovals}<div>evidence: {JSON.stringify(a.approvalEvidence)}</div><button className="mr-2 underline" onClick={()=>approve(a.id)}>Approve</button><button className="underline" onClick={()=>reject(a.id)}>Reject</button></div>)}</section>
    <section><h2 className="font-medium">Restricted Actions</h2><div className="text-sm">Policy-defined restricted action and playbook lists are shown in Policy Library.</div></section>
    <section><h2 className="font-medium">Automation Promotion Controls</h2><div className="text-sm">Promotion eligibility is governed by policy and requires approval when configured.</div></section>
    <section><h2 className="font-medium">Blast Radius Controls</h2><div className="text-sm">Auto-safe risk/blast radius thresholds are policy-bound.</div></section>
    <section><h2 className="font-medium">Batch Controls</h2><div className="text-sm">Batch size/failure thresholds are policy-bound.</div></section>
    <section><h2 className="font-medium">Rollback Governance</h2><div className="text-sm">Rollback recommendation path is policy-governed and does not bypass runtime controls.</div></section>
  </div></Layout>
}
