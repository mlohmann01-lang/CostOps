import React from 'react'
import { useLocation } from 'wouter'
import { useWorkspace } from '../../lib/workspaceContext'
import { useRuntimeContext } from '../../lib/runtimeContext'

export function shouldShowDemoBanner(mode: string) { return mode === 'demo' }

export function DemoBanner() {
  const workspace = useWorkspace()
  const runtime = useRuntimeContext()
  const [, navigate] = useLocation()
  if (!shouldShowDemoBanner(workspace.mode)) return null

  return (
    <div data-testid="demo-banner" style={{ position: 'sticky', top: 0, zIndex: 60, height: 36, display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', background: 'rgba(239,159,39,0.10)', borderBottom: 'var(--border-amber)' }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--amber)', border: 'var(--border-amber)', borderRadius: 999, padding: '2px 8px' }}>DEMO</span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>· Synthetic evidence only · No production systems connected · Live execution disabled</span>
      <span style={{ color: 'var(--text-tertiary)', fontSize: 11, marginLeft: 6 }}>{workspace.tenantName}</span>
      <button style={{ marginLeft: 'auto' }} onClick={() => { runtime.clearEnvironment(); navigate('/workspace') }}>Switch workspace</button>
    </div>
  )
}
