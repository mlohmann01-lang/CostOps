import React from 'react'
import type { ReactNode } from 'react'
import { Link } from 'wouter'
import { StatusChip, type StatusChipTone } from './StatusChip'

export type ExecutiveMetric = { label:string; value:ReactNode; description?:ReactNode; tone?:StatusChipTone; hero?:boolean; href?:string }

const toneColor: Record<StatusChipTone, string> = { success: 'var(--green)', warning: 'var(--amber)', danger: 'var(--red)', neutral: 'var(--text-primary)', info: 'var(--teal)' }

export function ExecutiveMetricCard({ label, value, description, tone = 'neutral', hero = false, href }: ExecutiveMetric) {
  const content = <section style={{ minWidth:0, border: hero ? 'var(--border-teal)' : 'var(--border-default)', background:'var(--bg-card)', borderRadius:10, padding:12, height:'100%', boxSizing:'border-box' }}>
    <div style={{ fontSize:11, color:'var(--text-label)', textTransform:'uppercase' }}>{label}</div>
    <div style={{ marginTop:4, fontSize:26, color: hero ? 'var(--teal)' : toneColor[tone], lineHeight:1.15 }}>{value}</div>
    {description && <div style={{ marginTop:7, fontSize:11, color:'var(--text-secondary)', lineHeight:1.45 }}>{description}</div>}
  </section>
  return href ? <Link href={href} style={{ color:'inherit', textDecoration:'none' }}>{content}</Link> : content
}

export function ExecutiveMetricStrip({ metrics, columns }: { metrics:ExecutiveMetric[]; columns?:string }) {
  return <section style={{ display:'grid', gridTemplateColumns: columns ?? `repeat(${Math.max(1, metrics.length)}, minmax(0, 1fr))`, gap:8 }}>
    {metrics.map((metric) => <ExecutiveMetricCard key={metric.label} {...metric} />)}
  </section>
}

export function ExecutiveNarrative({ title = 'Executive narrative', children, testId }: { title?:string; children:ReactNode; testId?:string }) {
  return <article data-testid={testId} style={{ border:'var(--border-teal)', background:'rgba(45,212,191,.08)', borderRadius:14, padding:16 }}>
    <h2 style={{ margin:0, fontSize:18 }}>{title}</h2>
    <div style={{ margin:'8px 0 0', color:'var(--text-secondary)', lineHeight:1.6 }}>{children}</div>
  </article>
}

export function ConfidenceBadge({ value, label = 'Confidence' }: { value?:number|string|null; label?:string }) {
  const normalized = value == null || value === '' ? 'Unavailable' : typeof value === 'number' ? `${Math.round(value)}%` : String(value)
  const upper = normalized.toUpperCase()
  const tone: StatusChipTone = upper.includes('UNAVAILABLE') || upper === 'LOW' ? 'danger' : upper.includes('HIGH') || Number.parseFloat(upper) >= 80 ? 'success' : upper.includes('MEDIUM') || Number.parseFloat(upper) >= 50 ? 'warning' : 'neutral'
  return <StatusChip label={`${label}: ${normalized}`} tone={tone} />
}

export function EvidenceBadge({ count, label = 'Evidence', state }: { count?:number|null; label?:string; state?:string }) {
  const availability = count == null ? (state ?? 'Unavailable') : `${count} ${count === 1 ? 'item' : 'items'}`
  const tone: StatusChipTone = count == null ? 'warning' : count > 0 ? 'success' : 'warning'
  return <StatusChip label={`${label}: ${availability}`} tone={tone} />
}

export function Timeline({ children, title }: { children:ReactNode; title?:string }) {
  return <div style={{ display:'grid', gap:6 }}>{title && <h3 style={{ margin:'8px 0 2px' }}>{title}</h3>}{children}</div>
}

export function TimelineEvent({ marker = '✓', title, timestamp, detail }: { marker?:ReactNode; title:ReactNode; timestamp?:ReactNode; detail?:ReactNode }) {
  return <div style={{ display:'grid', gridTemplateColumns:'20px 1fr', gap:8, alignItems:'baseline' }}><span>{marker}</span><span>{title}{timestamp && <> · {timestamp}</>}{detail && <> · {detail}</>}</span></div>
}

export function LiveStateBanner({ title, description, action }: { title:string; description:ReactNode; action?:ReactNode }) {
  return <section style={{ border:'var(--border-default)', background:'var(--bg-card)', borderRadius:10, padding:12, display:'flex', justifyContent:'space-between', gap:12, alignItems:'center', flexWrap:'wrap' }}>
    <div><strong>{title}</strong><div style={{ marginTop:4, color:'var(--text-secondary)', fontSize:12, lineHeight:1.45 }}>{description}</div></div>{action}
  </section>
}
