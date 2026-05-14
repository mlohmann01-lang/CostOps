# Build / CI Status

## Current branch / PR state
- Branch: `work`
- PR state: Not directly queryable from this environment; this update reflects local investigation performed on 2026-05-14.

## Checks that were failing
- GitHub checks were failing immediately because CI invoked `pnpm test`, but the repo root `package.json` had no `test` script.
- Local reproduction before fix:
  - `pnpm install` ✅
  - `pnpm typecheck` ✅
  - `pnpm run test` ❌ (`ERR_PNPM_NO_SCRIPT Missing script: test`)

## Root cause found
- Missing root-level `test` script caused CI jobs that run `pnpm test` to fail instantly before running project tests.
- Repository also lacked a tracked workflow under `.github/workflows`, so CI definition needed to be explicit and aligned with actual workspace commands.

## Fix applied
- Added root `test` script in `package.json` to run the API server's platform test suites:
  - `test:contoso`
  - `test:platform-boundaries`
- Added `.github/workflows/ci.yml` that:
  - sets up pnpm + Node 22,
  - runs `pnpm install --frozen-lockfile`,
  - runs `pnpm typecheck`,
  - runs `pnpm test`.

## Validation commands run
- `pnpm install`
- `pnpm typecheck`
- `pnpm run test`
- `pnpm --filter @workspace/api-server run test:contoso`
- `pnpm --filter @workspace/api-server run test:platform-boundaries`

## Remaining risks / next steps
- If branch protection expects specific check names from old/removed workflows, update required checks to match `CI / typecheck-and-tests`.
- No Dockerfile was found in this repository; if Docker-based checks are expected, add Dockerfile(s) and corresponding workflow jobs.
