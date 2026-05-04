export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: "compact",
    compactDisplay: "short",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
}

export function getTrustScoreColor(score: number): string {
  if (score >= 0.90) return "text-green-500 bg-green-500/10";
  if (score >= 0.75) return "text-amber-500 bg-amber-500/10";
  if (score >= 0.50) return "text-orange-500 bg-orange-500/10";
  return "text-red-500 bg-red-500/10";
}

export function getExecutionStatusColor(status: string): string {
  switch (status) {
    case 'AUTO_EXECUTE': return "text-green-500 border-green-500/30 bg-green-500/10";
    case 'APPROVAL_REQUIRED': return "text-amber-500 border-amber-500/30 bg-amber-500/10";
    case 'INVESTIGATE': return "text-orange-500 border-orange-500/30 bg-orange-500/10";
    case 'BLOCKED': return "text-red-500 border-red-500/30 bg-red-500/10";
    default: return "text-gray-500 border-gray-500/30 bg-gray-500/10";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'pending': return "text-blue-500 border-blue-500/30 bg-blue-500/10";
    case 'approved': return "text-green-500 border-green-500/30 bg-green-500/10";
    case 'rejected': return "text-red-500 border-red-500/30 bg-red-500/10";
    case 'executed': return "text-teal-500 border-teal-500/30 bg-teal-500/10";
    default: return "text-gray-500 border-gray-500/30 bg-gray-500/10";
  }
}
