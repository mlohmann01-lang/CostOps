import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

const arch = spawnSync(process.execPath, ['--test', 'artifacts/api-server/src/tests/architecture-boundaries.test.ts'], {
  stdio: 'inherit', cwd: '/workspace/CostOps', env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/contoso_test' },
});
if ((arch.status ?? 1) !== 0) process.exit(arch.status ?? 1);

const tests = [
  'src/tests/job-orchestration.test.ts',
  'src/tests/connector-registry.test.ts',
  'src/tests/trust-signal-adapter.test.ts',
  'src/tests/governance-exceptions.test.ts',
];

for (const testFile of tests) {
  const out = `dist/tests/${testFile.split('/').pop().replace('.ts', '.bundle.test.cjs')}`;
  await build({ entryPoints: [testFile], bundle: true, platform: 'node', format: 'cjs', sourcemap: false, outfile: out });
  const r = spawnSync(process.execPath, ['--test', out], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/contoso_test' } });
  if ((r.status ?? 1) !== 0) process.exit(r.status ?? 1);
}
