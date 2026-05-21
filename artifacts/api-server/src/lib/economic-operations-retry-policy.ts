export type RetryCategory =
  | 'RETRYABLE_RATE_LIMIT'
  | 'RETRYABLE_NETWORK'
  | 'RETRYABLE_TIMEOUT'
  | 'RETRYABLE_PROVIDER_5XX'
  | 'NON_RETRYABLE_AUTH'
  | 'NON_RETRYABLE_SCOPE'
  | 'NON_RETRYABLE_POLICY'
  | 'NON_RETRYABLE_VALIDATION'
  | 'NON_RETRYABLE_TENANT_MODE';

export type RetryPolicyConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  jitterFactor: number;
  retryAfterMs?: number;
};

export type RetryDecision = {
  shouldRetry: boolean;
  category: RetryCategory;
  delayMs: number;
  reason: string;
  attemptNumber: number;
  deadLetter: boolean;
};

const DEFAULT_POLICY: RetryPolicyConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 60000,
  jitterFactor: 0.25,
};

const NON_RETRYABLE: Set<RetryCategory> = new Set([
  'NON_RETRYABLE_AUTH',
  'NON_RETRYABLE_SCOPE',
  'NON_RETRYABLE_POLICY',
  'NON_RETRYABLE_VALIDATION',
  'NON_RETRYABLE_TENANT_MODE',
]);

export function classifyError(error: { status?: number; code?: string; message?: string }): RetryCategory {
  const status = error.status ?? 0;
  const code = error.code ?? '';
  const msg = (error.message ?? '').toLowerCase();

  if (status === 429 || code === 'RATE_LIMIT') return 'RETRYABLE_RATE_LIMIT';
  if (status === 401 || code === 'UNAUTHORIZED' || msg.includes('auth')) return 'NON_RETRYABLE_AUTH';
  if (status === 403 || code === 'FORBIDDEN' || msg.includes('scope') || msg.includes('permission')) return 'NON_RETRYABLE_SCOPE';
  if (status >= 500 && status < 600) return 'RETRYABLE_PROVIDER_5XX';
  if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT') return 'RETRYABLE_NETWORK';
  if (code === 'TIMEOUT' || msg.includes('timeout')) return 'RETRYABLE_TIMEOUT';
  if (msg.includes('policy') || msg.includes('blocked')) return 'NON_RETRYABLE_POLICY';
  if (msg.includes('validation') || msg.includes('invalid')) return 'NON_RETRYABLE_VALIDATION';
  if (msg.includes('tenant_mode') || msg.includes('tenant mode')) return 'NON_RETRYABLE_TENANT_MODE';

  return 'RETRYABLE_NETWORK';
}

export function computeRetryDecision(
  category: RetryCategory,
  attemptNumber: number,
  config: RetryPolicyConfig = DEFAULT_POLICY,
  retryAfterMs?: number,
): RetryDecision {
  if (NON_RETRYABLE.has(category)) {
    return { shouldRetry: false, category, delayMs: 0, reason: `Non-retryable error category: ${category}`, attemptNumber, deadLetter: true };
  }

  if (attemptNumber >= config.maxAttempts) {
    return { shouldRetry: false, category, delayMs: 0, reason: `Max attempts (${config.maxAttempts}) reached`, attemptNumber, deadLetter: true };
  }

  if (retryAfterMs != null) {
    return { shouldRetry: true, category, delayMs: Math.min(retryAfterMs, config.maxDelayMs), reason: `Retry-After header: ${retryAfterMs}ms`, attemptNumber, deadLetter: false };
  }

  const exponential = config.baseDelayMs * Math.pow(2, attemptNumber);
  const capped = Math.min(exponential, config.maxDelayMs);
  const jitter = capped * config.jitterFactor * Math.random();
  const delayMs = Math.floor(capped + jitter);

  return { shouldRetry: true, category, delayMs, reason: `Retryable (${category}), attempt ${attemptNumber + 1}`, attemptNumber, deadLetter: false };
}

export function evaluateRetry(
  error: { status?: number; code?: string; message?: string },
  attemptNumber: number,
  config?: RetryPolicyConfig,
  retryAfterMs?: number,
): RetryDecision {
  const category = classifyError(error);
  return computeRetryDecision(category, attemptNumber, config, retryAfterMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryPolicyConfig = DEFAULT_POLICY,
  onRetry?: (decision: RetryDecision) => void,
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      const errorLike = err instanceof Error
        ? { message: err.message, code: (err as NodeJS.ErrnoException).code }
        : { message: String(err) };
      const decision = evaluateRetry(errorLike, attempt, config);
      if (!decision.shouldRetry) throw err;
      onRetry?.(decision);
      await new Promise((r) => setTimeout(r, decision.delayMs));
      attempt++;
    }
  }
}
