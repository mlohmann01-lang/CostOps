import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout';

export default function SecurityView() {
  const [me, setMe] = useState<any>(null);
  const [perms, setPerms] = useState<any>(null);
  useEffect(()=>{ (async()=>{ setMe(await fetch('/api/security/me').then((r)=>r.json())); setPerms(await fetch('/api/security/permissions').then((r)=>r.json())); })(); },[]);
  return <Layout><div className='space-y-3'><h1 className='text-2xl font-semibold'>User / Role</h1>{me?<div className='border rounded p-3 text-sm'><div>Tenant-scoped: {me.tenantId}</div><div>Role: {me.role}</div><div>{me.role==='READ_ONLY_OBSERVER'?'Read-only access':''}</div><div>{me.role!=='APPROVER'?'Approval authority required':''}</div><div>{me.role!=='EXECUTION_OPERATOR'?'Execution permission required':''}</div><div>Restricted by governance policy</div></div>:null}<h2 className='font-semibold'>Permission matrix</h2><pre className='text-xs border rounded p-2'>{JSON.stringify(perms, null, 2)}</pre></div></Layout>;
}
