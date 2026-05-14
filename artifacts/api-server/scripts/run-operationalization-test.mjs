import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';

const tests = ['src/tests/operationalization.test.ts', 'src/tests/operationalization-packs.test.ts', 'src/tests/enterprise-subsystems.test.ts', 'src/tests/auth-rbac.test.ts', 'src/tests/tenant-isolation.test.ts', 'src/tests/env-validation.test.ts', 'src/tests/security-controls.test.ts', 'src/tests/auth-providers.test.ts', 'src/tests/tenant-isolation-v2.test.ts', 'src/tests/deployment-runtime.test.ts', 'src/tests/observability-metrics.test.ts', 'src/tests/security-anomaly.test.ts', 'src/tests/tenant-isolation-v3.test.ts', 'src/tests/auth-session-v3.test.ts', 'src/tests/enterprise-graph.test.ts', 'src/tests/workflow-intelligence.test.ts', 'src/tests/runtime-controls-v4.test.ts'];
for (const testFile of tests) {
  const out = `dist/tests/${testFile.split('/').pop().replace('.ts', '.bundle.test.cjs')}`;
  await build({ entryPoints: [testFile], bundle: true, platform: 'node', format: 'cjs', sourcemap: false, outfile: out });
  const result = spawnSync(process.execPath, ['--test', out], { stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'postgres://localhost:5432/contoso_test' } });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}
