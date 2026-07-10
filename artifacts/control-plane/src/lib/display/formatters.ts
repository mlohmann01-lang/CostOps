export function formatDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return 'Not available'
  const d = new Date(value)
  if (isNaN(d.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}

export function formatDateTime(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return 'Not available'
  const d = new Date(value)
  if (isNaN(d.getTime())) return 'Not available'
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(d)
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'Not available'
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value)
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return 'Not available'
  return `${Math.round(value)}%`
}
