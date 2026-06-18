import { useState } from 'react'
import { ChevronDown, ChevronRight, User, Building2, Wallet, ShieldAlert } from 'lucide-react'
import { useAssetContext } from '../../hooks/useAssetContext'
import type { DataState } from '../../lib/dataState'

const STATE_DOT: Record<DataState, string> = {
  LIVE: 'var(--c-teal-400)',
  SIMULATION: 'var(--c-amber-400)',
  DEMO: 'var(--c-amber-400)',
  NOT_CONNECTED: 'var(--c-red-400)',
  NO_DATA: 'var(--c-gray-400)',
}

const STATE_LABEL: Record<DataState, string> = {
  LIVE: 'Live',
  SIMULATION: 'Simulated',
  DEMO: 'Demo',
  NOT_CONNECTED: 'Not connected',
  NO_DATA: 'No owner data',
}

export function AssetContext({ targetType, targetId }: { targetType?: string; targetId?: string }) {
  const [open, setOpen] = useState(false)
  const { chain, dataState, loading } = useAssetContext(targetType, targetId)

  if (!targetType || !targetId) return null

  const owner = chain?.ownerUser?.displayName ?? chain?.ownerUserId
  const department = chain?.department?.name ?? chain?.departmentId
  const hasMissing = (chain?.missingFields?.length ?? 0) > 0 && dataState === 'LIVE'

  return (
    <div data-testid="asset-context" style={{ border: '1px solid var(--border-default)', borderRadius: 10, background: 'rgba(255,255,255,.02)' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Asset & Owner Context</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 10, background: 'rgba(255,255,255,.04)', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: STATE_DOT[dataState] }} />
          {loading ? 'Loading…' : STATE_LABEL[dataState]}
        </span>
      </button>
      {open && (
        <div style={{ padding: '0 10px 10px', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <User size={12} /> Owner: <span style={{ color: 'var(--text-primary)' }}>{owner ?? 'Unassigned'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Building2 size={12} /> Department: <span style={{ color: 'var(--text-primary)' }}>{department ?? 'Unassigned'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wallet size={12} /> Cost Centre: <span style={{ color: 'var(--text-primary)' }}>{chain?.costCentreId ?? 'Unassigned'}</span>
          </div>
          {hasMissing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--amber)' }}>
              <ShieldAlert size={12} /> Missing: {chain!.missingFields.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
