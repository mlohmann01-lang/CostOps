import React from 'react'
import { useLocation } from 'wouter'
import { useWorkspace } from '../../lib/workspaceContext'
import type { WorkspaceRuntimeState } from '../../types/workspace'

export function shouldShowDemoBanner(mode: string) { return mode === 'demo' }

type BannerConfig = {
  tag: string
  tagColor: string
  tagBg: string
  borderColor: string
  bg: string
  message: string
}

const BANNER: Record<Exclude<WorkspaceRuntimeState, 'LIVE_OPERATIONAL' | 'DEMO'> | 'DEMO', BannerConfig | null> = {
  DEMO: {
    tag: 'DEMO',
    tagColor: 'var(--amber, #ef9f27)',
    tagBg: 'rgba(239,159,39,0.10)',
    borderColor: 'var(--border-amber)',
    bg: 'rgba(239,159,39,0.10)',
    message: 'Synthetic evidence only · No production systems connected · Live execution disabled',
  },
  LIVE_UNCONNECTED: {
    tag: 'NO DATA',
    tagColor: 'var(--text-secondary, #b7bcc4)',
    tagBg: 'rgba(255,255,255,0.06)',
    borderColor: '0.5px solid rgba(255,255,255,0.10)',
    bg: 'rgba(255,255,255,0.03)',
    message: 'No production systems connected. Connect Microsoft 365 or another supported platform to begin discovery.',
  },
  LIVE_DISCOVERING: {
    tag: 'DISCOVERING',
    tagColor: 'var(--teal, #1D9E75)',
    tagBg: 'rgba(29,158,117,0.10)',
    borderColor: '0.5px solid rgba(29,158,117,0.25)',
    bg: 'rgba(29,158,117,0.06)',
    message: 'Connected systems are being analysed. Initial findings will appear as discovery completes.',
  },
}

export function DemoBanner() {
  const workspace = useWorkspace()
  const [, navigate] = useLocation()

  const rs = workspace.runtimeState
  if (rs === 'LIVE_OPERATIONAL') return null

  const config = BANNER[rs as keyof typeof BANNER]
  if (!config) return null

  return (
    <div
      data-testid="demo-banner"
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 60,
        height: 36,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        background: config.bg,
        borderBottom: config.borderColor,
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: config.tagColor,
          background: config.tagBg,
          border: `0.5px solid ${config.tagColor}`,
          borderRadius: 999,
          padding: '2px 8px',
        }}
      >
        {config.tag}
      </span>
      <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{config.message}</span>
      {rs === 'LIVE_UNCONNECTED' && (
        <a
          href="/exposure-review/connect?mode=live"
          style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--teal, #1D9E75)', textDecoration: 'none', fontWeight: 500 }}
        >
          Connect platform →
        </a>
      )}
      {rs === 'DEMO' && (
        <button style={{ marginLeft: 'auto', fontSize: 11 }} onClick={() => navigate('/workspace')}>
          Switch workspace
        </button>
      )}
    </div>
  )
}
