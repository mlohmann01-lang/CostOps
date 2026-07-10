// Program 11 — explicit Graph scope allowlist/denylist for the Exposure
// Review read-only discovery flow. This is intentionally separate from
// m365-readiness.ts (which checks required READ permissions for the
// authenticated production connector) — this guard exists to hard-fail
// discovery readiness the moment any write or content-read scope is
// requested or granted, regardless of what else is configured.

export const EXPOSURE_REVIEW_ALLOWED_SCOPES = [
  'User.Read.All',
  'Directory.Read.All',
  'Reports.Read.All',
  'AuditLog.Read.All',
] as const;

// Any scope on this list must hard-fail discovery readiness if requested or
// granted. This includes write scopes (could mutate the tenant) and content
// scopes (could read mail/file/chat/meeting content) — Exposure Review is
// read-only metadata discovery only, never content, never mutation.
export const EXPOSURE_REVIEW_FORBIDDEN_SCOPES = [
  'Mail.Read',
  'Mail.ReadWrite',
  'Files.Read.All',
  'Files.ReadWrite.All',
  'Sites.Read.All',
  'Sites.ReadWrite.All',
  'Chat.Read',
  'Chat.ReadWrite',
  'ChannelMessage.Read.All',
  'Calendars.Read',
  'Calendars.ReadWrite',
  'User.ReadWrite.All',
  'Directory.ReadWrite.All',
  'Group.ReadWrite.All',
] as const;

export type ExposureReviewScopeCheck = {
  ok: boolean;
  requestedScopes: string[];
  forbiddenScopesPresent: string[];
  unrecognizedScopes: string[];
  reason?: string;
};

/**
 * Validates a set of requested/granted Graph scopes against the Exposure
 * Review allowlist. Any forbidden scope present causes ok=false. Scopes that
 * are neither explicitly allowed nor explicitly forbidden are reported as
 * unrecognized (does not by itself fail the check, since Graph also returns
 * default/profile scopes like 'openid', 'offline_access') but forbidden
 * scopes always fail.
 */
export function checkExposureReviewScopes(requestedScopes: string[]): ExposureReviewScopeCheck {
  const requested = [...new Set(requestedScopes.map((scope) => scope.trim()).filter(Boolean))];
  const forbiddenScopesPresent = requested.filter((scope) =>
    (EXPOSURE_REVIEW_FORBIDDEN_SCOPES as readonly string[]).includes(scope),
  );
  const benign = new Set(['openid', 'profile', 'offline_access', 'email']);
  const unrecognizedScopes = requested.filter(
    (scope) =>
      !(EXPOSURE_REVIEW_ALLOWED_SCOPES as readonly string[]).includes(scope) &&
      !(EXPOSURE_REVIEW_FORBIDDEN_SCOPES as readonly string[]).includes(scope) &&
      !benign.has(scope),
  );
  return {
    ok: forbiddenScopesPresent.length === 0,
    requestedScopes: requested,
    forbiddenScopesPresent,
    unrecognizedScopes,
    reason: forbiddenScopesPresent.length
      ? `Forbidden Graph scope(s) requested for read-only Exposure Review discovery: ${forbiddenScopesPresent.join(', ')}`
      : undefined,
  };
}

export function defaultExposureReviewScopes(): string[] {
  return [...EXPOSURE_REVIEW_ALLOWED_SCOPES];
}
