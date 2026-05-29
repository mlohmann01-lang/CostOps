import React from 'react'
import type { RuntimeEvent } from '../../types/runtimeEvents'
import { StatusPill } from './Foundation'

type PillStatus = Parameters<typeof StatusPill>[0]['status']

function relativeTime(createdAt: string) {
  const timestamp = Date.parse(createdAt)
  if (!Number.isFinite(timestamp) || timestamp <= 0) return createdAt
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

function statusFor(event: RuntimeEvent): PillStatus {
  if (event.severity === 'error') return 'degraded'
  if (event.severity === 'warning') return event.type === 'DRIFT_DETECTED' ? 'drift-detected' : 'pending'
  if (event.type === 'DRIFT_RESOLVED') return 'resolved'
  if (event.type === 'EXECUTION_STARTED') return 'executing'
  if (event.type === 'EXECUTION_REQUESTED') return 'awaiting-execution'
  if (event.type === 'APPROVAL_GRANTED') return 'approved'
  if (event.type === 'OUTCOME_VERIFIED' || event.type === 'EXECUTION_COMPLETED') return 'verified'
  return 'ready'
}

export function RuntimeActivityList({ events, limit = 5, emptyLabel, compact }: { events: RuntimeEvent[]; limit?: number; emptyLabel: string; compact?: boolean }) {
  const rows = events.slice(0, limit)
  if (rows.length === 0) return <div data-testid='runtime-activity-empty' style={{ padding: compact ? '8px 0' : 12, color: 'var(--text-secondary)', fontSize: 13 }}>{emptyLabel}</div>
  return <div data-testid='runtime-activity-list'>{rows.map((event) => <div key={event.eventId} style={{ display: 'grid', gridTemplateColumns: compact ? '90px 1fr 120px' : '120px 1fr 140px', gap: 8, padding: compact ? '7px 0' : '10px 0', borderTop: 'var(--border-subtle)', alignItems: 'center' }}><span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{relativeTime(event.createdAt)}</span><strong style={{ fontSize: compact ? 13 : 14 }}>{event.message}</strong><StatusPill status={statusFor(event)} /></div>)}</div>
}
