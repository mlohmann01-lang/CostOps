export function formatCurrency(amount: number, currency = 'USD'): string {
  if (currency === 'GBP') {
    return `£${amount.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`
}

export function formatRelativeTime(isoString: string): string {
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHr = Math.floor(diffMs / 3_600_000)
  const diffDay = Math.floor(diffMs / 86_400_000)

  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  return `${diffDay}d ago`
}

export function isSyncStale(isoString: string | null, thresholdHours = 4): boolean {
  if (!isoString) return true
  const diffHr = (Date.now() - new Date(isoString).getTime()) / 3_600_000
  return diffHr > thresholdHours
}

export function truncateHash(hash: string, chars = 13): string {
  if (hash.length <= chars) return hash
  return hash.slice(0, chars) + '…'
}
