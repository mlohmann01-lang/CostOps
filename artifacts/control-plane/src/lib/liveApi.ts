export interface LiveApiError extends Error {
  status?: number
  body?: unknown
}

export function buildQuery(params: Record<string, unknown> = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    if (Array.isArray(value)) value.forEach((item) => query.append(key, String(item)))
    else query.set(key, String(value))
  }
  const text = query.toString()
  return text ? `?${text}` : ''
}

export function normalizeApiError(error: unknown): LiveApiError {
  if (error instanceof Error) return error as LiveApiError
  const next = new Error(typeof error === 'string' ? error : 'Live data unavailable') as LiveApiError
  next.body = error
  return next
}

export async function liveFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!path.startsWith('/api/')) throw new Error(`liveFetch requires a relative /api path: ${path}`)
  try {
    const response = await fetch(path, { credentials: 'include', ...options, headers: { accept: 'application/json', ...(options.headers ?? {}) } })
    const contentType = response.headers.get('content-type') ?? ''
    const body = contentType.includes('application/json') ? await response.json().catch(() => undefined) : await response.text().catch(() => undefined)
    if (!response.ok) {
      const err = new Error(`Live data unavailable (${response.status})`) as LiveApiError
      err.status = response.status
      err.body = body
      throw err
    }
    return body as T
  } catch (error) {
    throw normalizeApiError(error)
  }
}
