function extractMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  try {
    return String(error)
  } catch {
    return ''
  }
}

export function customerFacingError(error: unknown): string {
  const text = extractMessage(error)

  if (/\b403\b/.test(text)) {
    return 'You do not have access to this information. Contact your administrator if you believe this is incorrect.'
  }
  if (/\b404\b/.test(text)) {
    return 'This information is not available right now.'
  }
  if (/\b500\b/.test(text)) {
    return 'This information is currently unavailable. Please try again shortly.'
  }

  return 'This information is currently unavailable.'
}
