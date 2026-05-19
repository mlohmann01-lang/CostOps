# Typecheck baseline

As of 2026-05-19 sprint run, `@workspace/api-server` typecheck still reports pre-existing baseline failures after building dependencies.

## Baseline categories
- Legacy strict typing errors in existing modules unrelated to this sprint.
- Build-order coupling to workspace artifacts (`@workspace/db`, `@workspace/api-zod`).

## Sprint policy
- Sprint-introduced files must remain type-safe.
- Baseline failures are tracked and not hidden.
