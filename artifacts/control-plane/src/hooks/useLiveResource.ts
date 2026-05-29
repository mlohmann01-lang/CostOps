import { useCallback, useEffect, useMemo, useState } from 'react'
import { liveFetch, normalizeApiError } from '../lib/liveApi'
import { useWorkspace } from '../lib/workspaceContext'

function defaultIsEmpty(value: unknown) {
  if (Array.isArray(value)) return value.length === 0
  if (!value) return true
  if (typeof value === 'object') {
    const values = Object.values(value as Record<string, unknown>)
    return values.length === 0 || values.every((item) => Array.isArray(item) ? item.length === 0 : !item)
  }
  return false
}

export function useLiveResource<T>(input: {
  path: string | string[]
  enabled?: boolean
  normalizer?: (payload: unknown) => T
  refreshMs?: number
  initialData: T
  isEmpty?: (data: T) => boolean
  requireDataReady?: boolean
}) {
  const workspace = useWorkspace()
  const { path, enabled = true, normalizer, refreshMs, initialData, isEmpty = defaultIsEmpty as (data: T) => boolean, requireDataReady = true } = input
  const pathKey = Array.isArray(path) ? path.join('\u0000') : path
  const paths = useMemo(() => pathKey.split('\u0000'), [pathKey])
  const canLoad = workspace.mode === 'live' && enabled && (!requireDataReady || workspace.dataReady)
  const [data, setData] = useState<T>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const refresh = useCallback(async () => {
    if (!canLoad) {
      setData(initialData)
      setLoading(false)
      setError(null)
      setLastUpdated(null)
      return initialData
    }
    setLoading(true)
    try {
      let partialError: Error | null = null
      const raw = paths.length === 1 ? await liveFetch<unknown>(paths[0]) : await Promise.allSettled(paths.map((item) => liveFetch<unknown>(item))).then((results) => {
        const fulfilled = results.map((result) => result.status === 'fulfilled' ? result.value : undefined)
        const rejected = results.find((result) => result.status === 'rejected') as PromiseRejectedResult | undefined
        if (rejected) partialError = normalizeApiError(rejected.reason)
        if (results.every((result) => result.status === 'rejected')) throw partialError ?? new Error('Live data unavailable')
        return fulfilled
      })
      const next = normalizer ? normalizer(raw) : raw as T
      setData(next)
      setError(partialError)
      setLastUpdated(new Date())
      return next
    } catch (err) {
      const nextError = normalizeApiError(err)
      setData(initialData)
      setError(nextError)
      return initialData
    } finally {
      setLoading(false)
    }
  }, [canLoad, initialData, normalizer, paths])

  useEffect(() => {
    void refresh()
    if (!canLoad) return undefined
    const onRefresh = () => void refresh()
    if (typeof window !== 'undefined') window.addEventListener('certen:live-read-refresh', onRefresh)
    const timer = refreshMs ? setInterval(() => void refresh(), refreshMs) : undefined
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener('certen:live-read-refresh', onRefresh)
      if (timer) clearInterval(timer)
    }
  }, [canLoad, refresh, refreshMs])

  return { data, loading, error, isEmpty: isEmpty(data), lastUpdated, refresh }
}
