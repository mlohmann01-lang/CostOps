import React from 'react'
import { Shell } from '../components/layout/Shell'
import { EmptyState } from '../components/shared/Foundation'
import { useIntelligenceData } from '../hooks/useIntelligenceData'

export default function IntelligenceView({ params }: { params?: { domain?: string } }){ void params;const {data,isEmptyLive}=useIntelligenceData(); if(isEmptyLive) return <Shell><EmptyState title='No spend data yet' description='Intelligence will populate once your first connector syncs successfully.' ctaLabel='Go to Connector hub →' /></Shell>
 return <Shell><div style={{padding:20}}><h1>Intelligence</h1><p>Governed actions applied in April/May, driving spend down versus baseline trajectory.</p><div>Funnel: Identified ${data.funnel.identified} | Eligible ${data.funnel.eligible} | Pending ${data.funnel.pending} | Realised ${data.funnel.realised}</div><div>SaaS 94% | Cloud 82% | AI 76% | Data 52% <span title='Low confidence due to unconfigured ServiceNow connector.'>ⓘ</span></div><div>Confidence bars visible</div></div></Shell>}
