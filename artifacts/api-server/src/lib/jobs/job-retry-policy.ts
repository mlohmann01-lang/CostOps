// Retry policy configuration for job execution
type RetryPolicy = {
  maxAttempts: number;         // max total attempts (including first)
  baseDelayMs: number;         // delay after first failure
  maxDelayMs: number;          // cap on delay
  backoffMultiplier: number;   // exponential factor (2 = double each retry)
  jitterMs: number;            // random jitter to prevent thundering herd
}

const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 4,
  baseDelayMs: 2_000,          // 2s
  maxDelayMs: 30_000,          // 30s cap
  backoffMultiplier: 2,
  jitterMs: 500,
}

const NON_RETRYABLE_ERRORS = [
  'TENANT_NOT_FOUND',
  'AUTH_REQUIRED',
  'PERMISSION_DENIED',
  'PACK_NOT_FOUND',
] as const

// Compute the delay before the next attempt
// attempt: 1-indexed (1 = first retry, 2 = second retry, etc.)
// Formula: min(baseDelayMs * (backoffMultiplier ^ (attempt - 1)) + jitter, maxDelayMs)
function computeRetryDelay(policy: RetryPolicy, attempt: number): number {
  const jitter = Math.floor(Math.random() * policy.jitterMs)
  const exponential = policy.baseDelayMs * Math.pow(policy.backoffMultiplier, attempt - 1)
  return Math.min(exponential + jitter, policy.maxDelayMs)
}

function shouldRetry(policy: RetryPolicy, attemptNumber: number, error: Error): boolean {
  // Check for known non-retryable error messages
  for (const nonRetryable of NON_RETRYABLE_ERRORS) {
    if (error.message.includes(nonRetryable)) {
      return false
    }
  }

  // Returns true if more attempts remain
  return attemptNumber < policy.maxAttempts
}

// Execute a job function with automatic retries
async function withRetry<T>(
  fn: () => Promise<T>,
  policy?: Partial<RetryPolicy>,
  onRetry?: (attempt: number, error: Error, delayMs: number) => void,
): Promise<T> {
  const effectivePolicy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...policy }

  let lastError: Error = new Error('Unknown error')

  for (let attempt = 1; attempt <= effectivePolicy.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (!shouldRetry(effectivePolicy, attempt, lastError)) {
        throw lastError
      }

      const retryNumber = attempt // 1-indexed retry count (1 = first retry)
      const delayMs = computeRetryDelay(effectivePolicy, retryNumber)
      onRetry?.(attempt, lastError, delayMs)

      await new Promise<void>((resolve) => setTimeout(resolve, delayMs))
    }
  }

  throw lastError
}

export type { RetryPolicy }
export { DEFAULT_RETRY_POLICY, computeRetryDelay, shouldRetry, withRetry }
