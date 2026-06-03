import { spawnSync } from 'node:child_process'
import path from 'node:path'

const controlPlaneTests = [
  'artifacts/control-plane/src/lib/semantics.test.ts',
  'artifacts/control-plane/src/lib/services/services.test.ts',
  'artifacts/control-plane/src/lib/smoke.test.ts',
  'artifacts/control-plane/src/lib/recommendations-page.test.ts',
  'artifacts/control-plane/src/lib/ui-foundation.test.tsx',
  'artifacts/control-plane/src/lib/command-phase2.test.tsx',
  'artifacts/control-plane/src/lib/existing-pages-density.test.tsx',
  'artifacts/control-plane/src/lib/existing-pages-rendering.test.tsx',
  'artifacts/control-plane/src/lib/phase4a-operational-pages.test.tsx',
  'artifacts/control-plane/src/lib/phase4b-platform-pages.test.tsx',
  'artifacts/control-plane/src/lib/demo-runtime-realism.test.tsx',
  'artifacts/control-plane/src/lib/live-runtime-events.test.tsx',
  'artifacts/control-plane/src/lib/live-read-model.test.tsx',
  'artifacts/control-plane/src/lib/m365-live-recommendation-flow.test.tsx',
  'artifacts/control-plane/src/lib/recommendation-approval-bridge.test.tsx',
  'artifacts/control-plane/src/lib/execution-request-live.test.tsx',
  'artifacts/control-plane/src/lib/execution-request-dry-run-live.test.tsx',
  'artifacts/control-plane/src/lib/execution-request-execute-live.test.tsx',
  'artifacts/control-plane/src/lib/execution-outcome-verification-live.test.tsx',
  'artifacts/control-plane/src/lib/runtime-completion-live.test.tsx',
  'artifacts/control-plane/src/lib/data-trust-console.test.tsx',
  'artifacts/control-plane/src/lib/recommendation-explainability.test.tsx',
  'artifacts/control-plane/src/lib/trust-resolution-actions.test.tsx',
  'artifacts/control-plane/src/lib/trust-accountability.test.tsx',
  'artifacts/control-plane/src/lib/outcome-verification-evidence.test.tsx',
  'artifacts/control-plane/src/lib/vendor-intelligence.test.tsx',
  'artifacts/control-plane/src/lib/opportunities-page.test.tsx',
  'artifacts/control-plane/src/lib/renewals-page.test.tsx',
  'artifacts/control-plane/src/lib/renewal-contract-intelligence.test.tsx',
  'artifacts/control-plane/src/lib/ownership-intelligence.test.tsx',
  'artifacts/control-plane/src/lib/governance-graph.test.tsx',
  'artifacts/control-plane/src/lib/operating-mode.test.tsx',
  'artifacts/control-plane/src/lib/executive-ui-components.test.tsx',
  'artifacts/control-plane/src/lib/executive-risk-command-center.test.tsx',
  'artifacts/control-plane/src/lib/benchmark-intelligence.test.tsx',
  'artifacts/control-plane/src/lib/contract-intelligence.test.tsx',
  'artifacts/control-plane/src/lib/executive-priorities.test.tsx',
  'artifacts/control-plane/src/lib/utilization-intelligence.test.tsx',
  'artifacts/control-plane/src/lib/pilot-workspace.test.tsx',
  'artifacts/control-plane/src/lib/shadow-it-exposure.test.tsx',
  'artifacts/control-plane/src/lib/saas-rationalisation.test.tsx',
  'artifacts/control-plane/src/lib/ai-governance.test.tsx',
]

const knownFailures = new Map<string, string>([
  ['artifacts/control-plane/src/lib/execution-outcome-verification-live.test.tsx', 'KP-001/KP-002'],
  ['artifacts/control-plane/src/lib/runtime-completion-live.test.tsx', 'KP-003'],
  ['artifacts/control-plane/src/lib/demo-runtime-realism.test.tsx', 'KP-013'],
  ['artifacts/control-plane/src/lib/live-runtime-events.test.tsx', 'KP-004'],
  ['artifacts/control-plane/src/lib/live-read-model.test.tsx', 'KP-005'],
  ['artifacts/control-plane/src/lib/m365-live-recommendation-flow.test.tsx', 'KP-006'],
  ['artifacts/control-plane/src/lib/recommendation-approval-bridge.test.tsx', 'KP-007'],
  ['artifacts/control-plane/src/lib/execution-request-live.test.tsx', 'KP-008'],
  ['artifacts/control-plane/src/lib/execution-request-dry-run-live.test.tsx', 'KP-009'],
  ['artifacts/control-plane/src/lib/execution-request-execute-live.test.tsx', 'KP-010'],
  ['artifacts/control-plane/src/lib/trust-resolution-actions.test.tsx', 'KP-011'],
  ['artifacts/control-plane/src/lib/outcome-verification-evidence.test.tsx', 'KP-012'],
  ['artifacts/control-plane/src/lib/data-trust-console.test.tsx', 'KP-014'],
])

const filters = process.argv.slice(2).filter((arg) => arg !== '--')
const selected = filters.length ? controlPlaneTests.filter((file) => filters.some((filter) => file.includes(filter))) : controlPlaneTests

if (selected.length === 0) {
  console.error(`No control-plane tests matched: ${filters.join(', ')}`)
  process.exit(1)
}

const repoRoot = path.resolve(import.meta.dirname, '..')
const results = selected.map((file) => {
  const result = spawnSync('pnpm', ['--dir', repoRoot, '--filter', '@workspace/scripts', 'exec', 'tsx', '--test', path.resolve(repoRoot, file)], { cwd: repoRoot, encoding: 'utf8' })
  const passed = result.status === 0
  const known = knownFailures.get(file)
  const status = passed ? 'PASS' : known ? 'KNOWN FAIL' : 'NEW FAIL'
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.split('\n').filter(Boolean).slice(-6).join(' | ')
  return { file, status, known, output }
})

for (const result of results) {
  const id = result.known ? ` ${result.known}` : ''
  console.log(`${result.status}${id} ${result.file}`)
  if (result.status !== 'PASS' && result.output) console.log(`  ${result.output}`)
}

const totals = results.reduce((summary, result) => {
  summary[result.status] = (summary[result.status] ?? 0) + 1
  return summary
}, {} as Record<string, number>)

console.log(`\nSummary: PASS=${totals.PASS ?? 0} KNOWN FAIL=${totals['KNOWN FAIL'] ?? 0} NEW FAIL=${totals['NEW FAIL'] ?? 0}`)
process.exit((totals['NEW FAIL'] ?? 0) > 0 ? 1 : 0)
