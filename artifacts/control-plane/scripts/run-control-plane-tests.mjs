import { spawnSync } from 'node:child_process'

const tests = [
  '../artifacts/control-plane/src/lib/semantics.test.ts',
  '../artifacts/control-plane/src/lib/services/services.test.ts',
  '../artifacts/control-plane/src/lib/smoke.test.ts',
  '../artifacts/control-plane/src/lib/recommendations-page.test.ts',
  '../artifacts/control-plane/src/lib/ui-foundation.test.tsx',
  '../artifacts/control-plane/src/lib/command-phase2.test.tsx',
  '../artifacts/control-plane/src/lib/existing-pages-density.test.tsx',
  '../artifacts/control-plane/src/lib/existing-pages-rendering.test.tsx',
  '../artifacts/control-plane/src/lib/phase4a-operational-pages.test.tsx',
  '../artifacts/control-plane/src/lib/phase4b-platform-pages.test.tsx',
  '../artifacts/control-plane/src/lib/demo-runtime-realism.test.tsx',
  '../artifacts/control-plane/src/lib/live-runtime-events.test.tsx',
  '../artifacts/control-plane/src/lib/live-read-model.test.tsx',
  '../artifacts/control-plane/src/lib/m365-live-recommendation-flow.test.tsx',
  '../artifacts/control-plane/src/lib/recommendation-approval-bridge.test.tsx',
  '../artifacts/control-plane/src/lib/execution-request-live.test.tsx',
  '../artifacts/control-plane/src/lib/execution-request-dry-run-live.test.tsx',
  '../artifacts/control-plane/src/lib/execution-request-execute-live.test.tsx',
  '../artifacts/control-plane/src/lib/execution-outcome-verification-live.test.tsx',
  '../artifacts/control-plane/src/lib/runtime-completion-live.test.tsx',
  '../artifacts/control-plane/src/lib/data-trust-console.test.tsx',
  '../artifacts/control-plane/src/lib/recommendation-explainability.test.tsx',
  '../artifacts/control-plane/src/lib/trust-resolution-actions.test.tsx',
  '../artifacts/control-plane/src/lib/trust-accountability.test.tsx',
  '../artifacts/control-plane/src/lib/outcome-verification-evidence.test.tsx',
  '../artifacts/control-plane/src/lib/vendor-intelligence.test.tsx',
  '../artifacts/control-plane/src/lib/opportunities-page.test.tsx',
  '../artifacts/control-plane/src/lib/renewals-page.test.tsx',
  '../artifacts/control-plane/src/lib/renewal-contract-intelligence.test.tsx',
  '../artifacts/control-plane/src/lib/ownership-intelligence.test.tsx',
  '../artifacts/control-plane/src/lib/governance-graph.test.tsx',
  '../artifacts/control-plane/src/lib/operating-mode.test.tsx',
  '../artifacts/control-plane/src/lib/executive-ui-components.test.tsx',
  '../artifacts/control-plane/src/lib/executive-risk-command-center.test.tsx',
  '../artifacts/control-plane/src/lib/benchmark-intelligence.test.tsx',
  '../artifacts/control-plane/src/lib/contract-intelligence.test.tsx',
  '../artifacts/control-plane/src/lib/executive-priorities.test.tsx',
  '../artifacts/control-plane/src/lib/utilization-intelligence.test.tsx',
  '../artifacts/control-plane/src/lib/overview.test.tsx',
  '../artifacts/control-plane/src/lib/executive-value.test.tsx',
  '../artifacts/control-plane/src/lib/sidebar-overview-regression.test.tsx',
  '../artifacts/control-plane/src/lib/pilot-workspace.test.tsx',
  '../artifacts/control-plane/src/lib/technology-portfolio.test.tsx',
  '../artifacts/control-plane/src/lib/executive-proof-packs.test.tsx',
  '../artifacts/control-plane/src/lib/governed-execution.test.tsx',
  '../artifacts/control-plane/src/lib/shadow-it-exposure.test.tsx',
  '../artifacts/control-plane/src/lib/saas-rationalisation.test.tsx',
  '../artifacts/control-plane/src/lib/ai-governance.test.tsx',
  '../artifacts/control-plane/src/lib/approval-center-ui.test.tsx',
  '../artifacts/control-plane/src/lib/outcome-protection-ui.test.tsx',
  '../artifacts/control-plane/src/lib/display/formatters.test.ts',
  '../artifacts/control-plane/src/lib/display/labels.test.ts',
  '../artifacts/control-plane/src/lib/display/errors.test.ts',
  '../artifacts/control-plane/src/lib/readiness/readinessState.test.ts',
]

const patterns = process.argv.slice(2).filter((arg) => arg !== '--')
const selected = patterns.length ? tests.filter((file) => patterns.some((pattern) => file.includes(pattern))) : tests

if (selected.length === 0) {
  console.error(`No control-plane tests matched: ${patterns.join(', ')}`)
  process.exit(1)
}

const result = spawnSync('pnpm', ['--dir', '../..', '--filter', '@workspace/scripts', 'exec', 'tsx', '--test', ...selected], { stdio: 'inherit' })
process.exit(result.status ?? 1)
