import React from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState } from '../components/shared/Foundation'
import { useExecutionData } from '../hooks/useExecutionData'

export default function ExecutionView(){ const {data,isEmptyLive}=useExecutionData(); if(isEmptyLive) return <Shell><EmptyState title='No actions identified yet' description='Connect your first data source to begin discovering optimisation opportunities.' /></Shell>
 return <Shell><div style={{padding:20}}><h1>Execution</h1><div>Total saving realised this month: $25,800/mo</div><h3>Awaiting execution</h3>{data.awaiting.map((r:any)=><div key={r.id}>{r.action} · {r.at} <button>Simulate execution</button></div>)}<h3>Completed</h3>{data.completed.map((r:any)=><div key={r.id}>{r.action} · ${r.saving}/mo <button>Rollback</button></div>)}</div></Shell> }
