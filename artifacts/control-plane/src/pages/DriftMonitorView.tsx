import React from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState } from '../components/shared/Foundation'
import { useDriftData } from '../hooks/useDriftData'

export default function DriftMonitorView(){const {data,isEmptyLive}=useDriftData(); if(isEmptyLive) return <Shell><EmptyState title='No drift detected' description='Drift monitor will watch your executed actions for savings erosion once outcomes are recorded.' /></Shell>
 return <Shell><div style={{padding:20}}><h1>Drift monitor</h1><div>Active alerts: 3 | Value at risk: $2,540 | Monitored outcomes: 5</div>{data.map((d:any)=><div key={d.id}>{d.title} · {d.status} · {d.risk} risk · ${d.atRisk} at risk <button>Review evidence</button>{d.status!=='Resolved'&&<button>Mark resolved</button>}</div>)}</div></Shell>}
