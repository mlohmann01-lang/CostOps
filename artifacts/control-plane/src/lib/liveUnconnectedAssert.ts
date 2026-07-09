import assert from 'node:assert/strict'

/**
 * FORBIDDEN strings that must NEVER appear in LIVE_UNCONNECTED rendered output.
 * These are synthetic demo values from hardcoded data sources.
 */
export const LIVE_UNCONNECTED_FORBIDDEN: readonly string[] = [
  'ChatGPT',
  'Slack',
  'Claude',
  'Tableau',
  'Dropbox',
  '50,400',
  '97%',
  '1 / 7',
]

/**
 * REQUIRED strings that MUST appear in LIVE_UNCONNECTED rendered output.
 */
export const LIVE_UNCONNECTED_REQUIRED: readonly string[] = [
  'No production systems connected.',
  'Connect Microsoft 365 or another supported platform to begin discovery.',
  'No Findings Yet',
  'Connect a supported platform to begin discovery.',
  'Connect Microsoft 365',
  'Run Tenant Readiness',
  'Begin Discovery',
]

/**
 * Asserts that rendered HTML from the Executive Command Center in LIVE_UNCONNECTED
 * state contains no synthetic demo data.  Throws with a descriptive message identifying
 * the offending term so test failure output is immediately actionable.
 */
export function assertNoSyntheticDataInLiveUnconnected(html: string): void {
  for (const term of LIVE_UNCONNECTED_FORBIDDEN) {
    assert.ok(
      !html.includes(term),
      `LIVE_UNCONNECTED rendered HTML must not contain "${term}" — synthetic demo data leak detected`,
    )
  }
}

/**
 * Asserts that rendered HTML from CommandViewBody in LIVE_UNCONNECTED state
 * contains all required strings and none of the forbidden ones.
 */
export function assertCommandViewLiveUnconnected(html: string): void {
  assertNoSyntheticDataInLiveUnconnected(html)
  for (const term of LIVE_UNCONNECTED_REQUIRED) {
    assert.ok(
      html.includes(term),
      `LIVE_UNCONNECTED rendered HTML must contain "${term}" — expected onboarding copy is missing`,
    )
  }
}
