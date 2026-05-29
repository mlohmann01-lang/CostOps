import React from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState, LiveDataError } from '../components/shared/Foundation'
import { useOutcomesData } from '../hooks/useOutcomesData'

export default function OutcomeLedgerView(){const {data,isEmptyLive,error,refresh}=useOutcomesData(); if(error) return <Shell><LiveDataError error={error} onRetry={refresh} /></Shell>
 if(isEmptyLive) return <Shell><EmptyState title='No verified savings yet' description='Outcomes will appear here as actions are executed and savings are evidence-verified.' /></Shell>
 const [a,b,c,d,e,f]=data.stats
 return <Shell><div style={{padding:20}}><h1>Outcomes</h1><div>${a} projected | ${b} verified | ${c} variance <span title='Difference between projected and evidence-verified savings. This gap closes as actions complete verification cycles. Normal for early-stage execution.'>ⓘ</span></div><div>{d} pending verification | {e} failed | {f} drift detected</div>{data.ledger.map((l:any)=><div key={l.id}>{l.action} · Projected ${l.projected} · {l.verified?`Verified $${l.verified}`:'Pending verify'} · {l.evidence} · {l.state}</div>)}</div></Shell>}
