# Canonical Release Gates

## Required Gate Order
1. `pnpm --filter @workspace/db build`
2. `pnpm --filter @workspace/api-server typecheck`
3. `pnpm --filter @workspace/control-plane test`
4. Targeted backend tests for sprint scope (examples: `outcome-ledger.test.ts`, `governance-scheduler.test.ts`, `outcome-verification.test.ts`)
5. `pnpm test`

## Gate Intent
- DB build validates schema/type export integrity.
- API typecheck validates runtime spine compile-time correctness.
- Control-plane tests validate UI semantic contracts.
- Targeted tests validate sprint-specific invariants.
- Full test run validates cross-subsystem safety.

## Release Principle
No release passes if governance controls, verification logic, or tenant-isolation checks regress.
