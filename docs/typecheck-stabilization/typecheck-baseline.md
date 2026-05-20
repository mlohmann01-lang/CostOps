# Typecheck Baseline Isolation

## Root cause identified
The failing baseline was not TS6305 declaration-linkage from `@workspace/db` after rebuild; `@workspace/db` and `@workspace/api-zod` built cleanly and `@workspace/api-server` failures were caused by economic-forecasting contract drift:

- Forecast model return shapes diverged from `economic-forecasting-types.ts`.
- Numeric severity fields were returned as string labels.
- `forecastWindow` became required in forecast input contracts but some tests were not updated.
- A typo in `forecast-assumption-drift.ts` (`Math.Math.max`) caused an additional typecheck error.

## Final status
- `COREPACK_ENABLE_PROJECT_SPEC=0 pnpm --filter @workspace/db build` ✅
- `COREPACK_ENABLE_PROJECT_SPEC=0 pnpm --filter @workspace/api-zod build` ✅
- `COREPACK_ENABLE_PROJECT_SPEC=0 pnpm --filter @workspace/api-server typecheck` ✅

Typecheck baseline is now stabilized for this sprint scope.
