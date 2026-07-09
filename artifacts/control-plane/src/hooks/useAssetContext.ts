import { useCallback, useEffect, useState } from 'react'
import { useWorkspace } from '../lib/workspaceContext'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import type { DataState } from '../lib/dataState'

export type AssetOwnerUser = { id: string; displayName?: string; email?: string; departmentId?: string }
export type AssetDepartment = { id: string; name?: string }
export type AssetOwnerChain = {
  targetType: string
  targetId: string
  ownerUserId?: string
  ownerUser?: AssetOwnerUser
  managerUserId?: string
  departmentId?: string
  department?: AssetDepartment
  costCentreId?: string
  executiveOwnerId?: string
  missingFields: string[]
}

export type AssetContextData = { chain: AssetOwnerChain | null; dataState: DataState; error?: string }

const ALL_FIELDS = ['ownerUserId', 'managerUserId', 'departmentId', 'costCentreId', 'executiveOwnerId']

function emptyChain(targetType: string, targetId: string): AssetOwnerChain {
  return { targetType, targetId, missingFields: [...ALL_FIELDS] }
}

export function demoAssetChain(targetType: string, targetId: string): AssetOwnerChain {
  return {
    targetType, targetId,
    ownerUserId: 'demo-owner', ownerUser: { id: 'demo-owner', displayName: 'Jordan Lee', email: 'jordan.lee@demo-sandbox.io', departmentId: 'demo-dept' },
    managerUserId: 'demo-manager', departmentId: 'demo-dept', department: { id: 'demo-dept', name: 'IT Operations' },
    costCentreId: 'demo-cc-100', executiveOwnerId: 'demo-exec', missingFields: [],
  }
}

export function useAssetContext(targetType?: string, targetId?: string) {
  const workspace = useWorkspace()
  const [data, setData] = useState<AssetContextData>({ chain: null, dataState: 'DEMO' })
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    if (!targetType || !targetId) { setData({ chain: null, dataState: 'NO_DATA' }); return }
    if (workspace.mode === 'demo') { setData({ chain: demoAssetChain(targetType, targetId), dataState: 'DEMO' }); return }
    if (!workspace.dataReady) { setData({ chain: emptyChain(targetType, targetId), dataState: 'NOT_CONNECTED' }); return }
    setLoading(true)
    try {
      const chain = await liveFetch<AssetOwnerChain>(`/api/ownership-intelligence/resolve?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`)
      const hasData = !!(chain?.ownerUserId || chain?.departmentId || chain?.executiveOwnerId)
      setData({ chain: hasData ? chain : emptyChain(targetType, targetId), dataState: hasData ? 'LIVE' : 'NO_DATA' })
    } catch (error) {
      const err = normalizeApiError(error)
      setData({ chain: emptyChain(targetType, targetId), dataState: 'NO_DATA', error: err.message })
    } finally { setLoading(false) }
  }, [targetType, targetId, workspace.mode, workspace.dataReady])

  useEffect(() => { void refresh() }, [refresh])
  return { ...data, loading, refresh }
}
