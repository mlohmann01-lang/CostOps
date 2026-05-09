import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

await build({
  entryPoints: ['src/tests/contoso-scenario.test.ts'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  sourcemap: false,
  outfile: 'dist/tests/contoso-scenario.bundle.test.cjs',
});

const result = spawnSync(process.execPath, ['--test', 'dist/tests/contoso-scenario.bundle.test.cjs'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/contoso_test' },
});

process.exit(result.status ?? 1);
