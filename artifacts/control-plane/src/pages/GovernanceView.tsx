import React from 'react'
import { useState } from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, StatusPill, LiveDataError } from '../components/shared/Foundation'
import { useGovernanceData } from '../hooks/useGovernanceData'

const initials=(e:string)=>e==='system'?'SYS':e.split('@')[0].split('.').map(x=>x[0]).join('').slice(0,2).toUpperCase()
export default function GovernanceView(){
 const {data,isEmptyLive,error,refresh}=useGovernanceData(); const [cert,setCert]=useState<string|undefined>()
 if(error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
 if(isEmptyLive) return <Shell><EmptyState title='No governance events yet' description='Events will appear here as actions are evaluated and approved.' /></Shell>
 return <Shell><div style={{padding:20}}><h1>Governance</h1><div>Approvals Required: 2 | Blocked: 1 | Warnings: 2 | Avg trust score: 79%</div>
 {data.map((r:any)=><div key={r.id}><span>{r.at}</span> <span>{r.action}</span> <StatusPill status={r.verdict==='Eligible'?'eligible':r.verdict==='Approval required'?'approval-required':'never-eligible'} /> <button style={{fontFamily:'monospace'}} onClick={()=>setCert(r.certId)}>{r.certId}</button> <span>{initials(r.actor)} {r.actor}</span>{r.verdict==='Never eligible'&&<span title='This action has no rollback path — committed spend cannot be reversed.'> ⓘ</span>}</div>)}
 {cert&&<div>Proof drawer: {cert}</div>}</div></Shell>
}
