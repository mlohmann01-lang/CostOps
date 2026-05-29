import React from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, StatusPill } from '../components/shared/Foundation'
import { useDriftData } from '../hooks/useDriftData'
import { simulateResolveDrift } from '../lib/demoRuntimeStore'

export default function DriftMonitorView(){const {data,isEmptyLive}=useDriftData(); if(isEmptyLive) return <Shell><EmptyState title='No drift detected' description='Drift monitor will watch your executed actions for savings erosion once outcomes are recorded.' /></Shell>
 const active = data.filter((d:any)=>d.status !== 'Resolved').length
 const atRisk = data.reduce((sum:number,d:any)=>sum + Number(d.atRisk ?? 0), 0)
 return <Shell><div style={{padding:20}}><h1>Drift monitor</h1><div>Active alerts: {active} | Value at risk: ${atRisk.toLocaleString()} | Monitored outcomes: {data.length}</div>{data.map((d:any)=><div key={d.id}>{d.title} · <StatusPill status={d.status === 'Resolved' ? 'resolved' : 'drift-detected'} /> · {d.risk} risk · ${d.atRisk} at risk <button>Review evidence</button>{d.status!=='Resolved'&&<button onClick={() => simulateResolveDrift(d.id)}>Mark resolved</button>}</div>)}</div></Shell>}
